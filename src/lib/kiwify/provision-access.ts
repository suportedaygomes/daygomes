import { generateTemporaryPassword } from "@/lib/auth/password";
import { normalizeCpf, isValidCpf } from "@/lib/cpf";
import { sendAccessEmail } from "@/lib/email/send-access-email";
import type { KiwifyOrderWebhook } from "@/lib/kiwify/types";
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
    "Aluno Day Gomes";

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
    .select("id, edital_id, cargo_id, kiwify_product_name, is_active")
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

  const cpfRaw = payload.Customer?.CPF ?? "";
  const cpf = normalizeCpf(cpfRaw);
  const cpfValid = cpf ? isValidCpf(cpf) : false;

  let profileId: string | null = null;
  let createdUser = false;
  let temporaryPassword: string | undefined;

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    profileId = existingProfile.id;
    if (cpfValid) {
      await admin.from("profiles").update({ cpf, full_name: fullName }).eq("id", profileId);
    }
  } else {
    temporaryPassword = generateTemporaryPassword();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "membro",
        cpf: cpfValid ? cpf : undefined,
      },
    });

    if (createError || !created.user) {
      return { ok: false, orderId, error: "Não foi possível criar o usuário." };
    }

    profileId = created.user.id;
    createdUser = true;

    await admin
      .from("profiles")
      .update({
        full_name: fullName,
        role: "membro",
        email,
        cpf: cpfValid ? cpf : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);
  }

  let enrollmentId: string | null = null;

  const { data: existingEnrollment } = await admin
    .from("member_edital_enrollments")
    .select("id")
    .eq("member_id", profileId)
    .eq("edital_id", mapping.edital_id)
    .eq("cargo_id", mapping.cargo_id)
    .maybeSingle();

  if (existingEnrollment) {
    enrollmentId = existingEnrollment.id;
  } else {
    const { data: enrollment, error: enrollError } = await admin
      .from("member_edital_enrollments")
      .insert({
        member_id: profileId,
        edital_id: mapping.edital_id,
        cargo_id: mapping.cargo_id,
      })
      .select("id")
      .single();

    if (enrollError || !enrollment) {
      return { ok: false, orderId, error: "Não foi possível vincular o edital." };
    }

    enrollmentId = enrollment.id;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const emailResult = await sendAccessEmail({
    to: email,
    fullName,
    loginUrl: `${siteUrl.replace(/\/$/, "")}/login`,
    password: createdUser ? temporaryPassword : undefined,
    productName: productName ?? mapping.kiwify_product_name ?? undefined,
  });

  await admin.from("kiwify_access_emails").insert({
    profile_id: profileId,
    recipient_email: email,
    subject: createdUser
      ? "Seu acesso ao Day Gomes foi liberado"
      : "Novo curso liberado no Day Gomes",
    status: emailResult.ok ? "sent" : "failed",
    error_message: emailResult.ok ? null : emailResult.error,
    order_id: orderId,
  });

  await admin.from("kiwify_order_events").insert({
    order_id: orderId,
    webhook_event_type: payload.webhook_event_type ?? "order_approved",
    order_status: payload.order_status ?? null,
    customer_email: email,
    kiwify_product_id: productId,
    profile_id: profileId,
    enrollment_id: enrollmentId,
    access_email_sent: emailResult.ok,
    created_user: createdUser,
    payload,
  });

  return {
    ok: true,
    orderId,
    emailSent: emailResult.ok,
    reason: emailResult.ok ? undefined : `E-mail não enviado: ${emailResult.error}`,
  };
}
