import { normalizeCpf, isValidCpf } from "@/lib/cpf";
import { sendAccessEmail } from "@/lib/email/send-access-email";
import { resolveOrCreateMemberProfile } from "@/lib/kiwify/resolve-member-profile";
import type { KiwifyOrderWebhook } from "@/lib/kiwify/types";
import { SITE_DISPLAY_NAME } from "@/lib/legal/site";
import { normalizeKiwifyMappingQuota } from "@/lib/editais/enrollment-quota";
import { syncMemberPhaseAccessForEnrollment } from "@/lib/editais/sync-member-phase-access";
import { mergeKiwifyEnrollmentQuota } from "@/lib/kiwify/merge-enrollment-quota";
import {
  memberHasCorrectionPlatformAccess,
  removeMemberAccountIfNoCorrectionAccess,
} from "@/lib/members/member-platform-access";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProvisionResult =
  | { ok: true; orderId: string; skipped?: boolean; reason?: string; emailSent?: boolean }
  | { ok: false; orderId?: string; error: string };

export async function provisionKiwifyOrder(
  payload: KiwifyOrderWebhook,
): Promise<ProvisionResult> {
  const orderId = payload.order_id?.trim();
  const email = payload.Customer?.email?.trim().toLowerCase();
  const productId = payload.Product?.product_id?.trim();
  const productName = payload.Product?.product_name?.trim();
  const fullName =
    payload.Customer?.full_name?.trim() ||
    payload.Customer?.first_name?.trim() ||
    "Aluno";

  if (!orderId || !email || !productId) {
    return { ok: false, error: "Payload incompleto." };
  }

  const admin = createAdminClient();

  const { data: existingApproval } = await admin
    .from("kiwify_order_events")
    .select("id")
    .eq("order_id", orderId)
    .in("webhook_event_type", ["order_approved", "compra_aprovada"])
    .maybeSingle();

  if (existingApproval) {
    return { ok: true, orderId, skipped: true, reason: "Compra já processada." };
  }

  const { data: mapping } = await admin
    .from("kiwify_product_mappings")
    .select("id, edital_id, correction_quota, kiwify_product_name, is_active")
    .eq("kiwify_product_id", productId)
    .maybeSingle();

  if (!mapping || !mapping.is_active) {
    await admin.from("kiwify_order_events").insert({
      order_id: orderId,
      webhook_event_type: payload.webhook_event_type ?? "order_approved",
      order_status: payload.order_status ?? null,
      customer_email: email,
      kiwify_product_id: productId,
      payload,
    });
    return {
      ok: true,
      orderId,
      skipped: true,
      reason: "Produto Kiwify sem mapeamento de edital.",
    };
  }

  const purchasedQuota = normalizeKiwifyMappingQuota(mapping.correction_quota);

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (purchasedQuota === 0 && !existingProfile) {
    await admin.from("kiwify_order_events").insert({
      order_id: orderId,
      webhook_event_type: payload.webhook_event_type ?? "order_approved",
      order_status: payload.order_status ?? null,
      customer_email: email,
      kiwify_product_id: productId,
      payload,
    });
    return {
      ok: true,
      orderId,
      skipped: true,
      reason:
        "Produto sem correções na plataforma — conta e inscrição não criadas (conteúdo só na Kiwify).",
    };
  }

  const cpfRaw = payload.Customer?.CPF ?? "";
  const cpf = normalizeCpf(cpfRaw);
  const cpfValid = cpf ? isValidCpf(cpf) : false;

  const memberResult = await resolveOrCreateMemberProfile({
    admin,
    email,
    fullName,
    cpfValid,
    cpf,
  });

  if (!memberResult.ok) {
    console.error(
      "[kiwify:provision] resolve member failed",
      memberResult.logDetail,
      { orderId, email },
    );
    return { ok: false, orderId, error: memberResult.error };
  }

  let profileId: string | null = memberResult.profileId;
  let createdUser = memberResult.createdUser;
  const temporaryPassword = memberResult.temporaryPassword;

  if (memberResult.cpfOmitted) {
    console.warn("[kiwify:provision] CPF omitido (já usado por outro perfil)", {
      orderId,
      email,
    });
  }

  let enrollmentId: string | null = null;

  const { data: existingEnrollment } = await admin
    .from("member_edital_enrollments")
    .select("id, correction_quota")
    .eq("member_id", profileId)
    .eq("edital_id", mapping.edital_id)
    .maybeSingle();

  const mergedQuota = mergeKiwifyEnrollmentQuota(
    existingEnrollment?.correction_quota,
    purchasedQuota,
  );

  if (existingEnrollment) {
    enrollmentId = existingEnrollment.id;
    await admin
      .from("member_edital_enrollments")
      .update({
        correction_quota: mergedQuota,
        cargo_id: null,
      })
      .eq("id", existingEnrollment.id);
  } else {
    const { data: enrollment, error: enrollError } = await admin
      .from("member_edital_enrollments")
      .insert({
        member_id: profileId,
        edital_id: mapping.edital_id,
        cargo_id: null,
        correction_quota: mergedQuota,
      })
      .select("id")
      .single();

    if (enrollError || !enrollment) {
      console.error(
        "[kiwify:provision] enrollment insert failed",
        enrollError?.message ?? "sem enrollment",
        { orderId, profileId, editalId: mapping.edital_id },
      );
      return { ok: false, orderId, error: "Não foi possível vincular o edital." };
    }

    enrollmentId = enrollment.id;
  }

  if (enrollmentId) {
    await syncMemberPhaseAccessForEnrollment(admin, enrollmentId);
  }

  let hasPlatformAccess = await memberHasCorrectionPlatformAccess(admin, profileId);

  if (!hasPlatformAccess && profileId) {
    const removal = await removeMemberAccountIfNoCorrectionAccess(admin, profileId);
    if (removal.removed) {
      profileId = null;
      enrollmentId = null;
      createdUser = false;
      hasPlatformAccess = false;
    }
  }

  const shouldSendAccessEmail =
    hasPlatformAccess && (createdUser || purchasedQuota > 0);

  let emailSent = false;
  let emailSkipReason: string | undefined;

  if (shouldSendAccessEmail) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const emailResult = await sendAccessEmail({
      to: email,
      fullName,
      loginUrl: `${siteUrl.replace(/\/$/, "")}/login`,
      password: createdUser ? temporaryPassword : undefined,
      productName: productName ?? mapping.kiwify_product_name ?? undefined,
    });

    emailSent = emailResult.ok;

    await admin.from("kiwify_access_emails").insert({
      profile_id: profileId,
      recipient_email: email,
      subject: createdUser
        ? `Seu acesso à ${SITE_DISPLAY_NAME} foi liberado`
        : `Novo curso liberado na ${SITE_DISPLAY_NAME}`,
      status: emailResult.ok ? "sent" : "failed",
      error_message: emailResult.ok ? null : emailResult.error,
      order_id: orderId,
    });

    if (!emailResult.ok) {
      emailSkipReason = `E-mail não enviado: ${emailResult.error}`;
    }
  } else if (!hasPlatformAccess) {
    emailSkipReason =
      "Sem cota de correção na plataforma — e-mail de acesso não enviado.";
  }

  await admin.from("kiwify_order_events").insert({
    order_id: orderId,
    webhook_event_type: payload.webhook_event_type ?? "order_approved",
    order_status: payload.order_status ?? null,
    customer_email: email,
    kiwify_product_id: productId,
    profile_id: profileId,
    enrollment_id: enrollmentId,
    access_email_sent: emailSent,
    created_user: createdUser,
    payload,
  });

  return {
    ok: true,
    orderId,
    emailSent,
    reason: emailSkipReason,
  };
}
