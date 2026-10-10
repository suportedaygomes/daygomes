import { sendRefundNoticeEmail } from "@/lib/email/send-access-email";
import type { KiwifyOrderWebhook } from "@/lib/kiwify/types";
import { createAdminClient } from "@/lib/supabase/admin";

const APPROVAL_EVENTS = new Set(["order_approved", "compra_aprovada"]);
const REFUND_EVENTS = new Set([
  "order_refunded",
  "compra_reembolsada",
  "chargeback",
]);

export type RevokeResult =
  | { ok: true; orderId: string; skipped?: boolean; reason?: string }
  | { ok: false; orderId?: string; error: string };

export function isKiwifyRefundEvent(payload: KiwifyOrderWebhook) {
  const event = (payload.webhook_event_type ?? "").toLowerCase();
  const status = (payload.order_status ?? "").toLowerCase();

  if (REFUND_EVENTS.has(event)) return true;
  return status === "refunded" || status === "chargedback";
}

export async function revokeKiwifyOrder(payload: KiwifyOrderWebhook): Promise<RevokeResult> {
  const orderId = payload.order_id?.trim();
  const email = payload.Customer?.email?.trim().toLowerCase();
  const productId = payload.Product?.product_id?.trim();
  const eventType = (payload.webhook_event_type ?? "order_refunded").toLowerCase();
  const productName = payload.Product?.product_name?.trim();

  if (!orderId || !email) {
    return { ok: false, error: "Payload de reembolso incompleto." };
  }

  const admin = createAdminClient();

  const { data: refundAlready } = await admin
    .from("kiwify_order_events")
    .select("id")
    .eq("order_id", orderId)
    .in("webhook_event_type", [...REFUND_EVENTS])
    .maybeSingle();

  if (refundAlready) {
    return { ok: true, orderId, skipped: true, reason: "Reembolso já processado." };
  }

  let enrollmentId: string | null = null;
  let profileId: string | null = null;

  const { data: approvalEvent } = await admin
    .from("kiwify_order_events")
    .select("enrollment_id, profile_id, kiwify_product_id")
    .eq("order_id", orderId)
    .in("webhook_event_type", [...APPROVAL_EVENTS])
    .maybeSingle();

  if (approvalEvent?.enrollment_id) {
    enrollmentId = approvalEvent.enrollment_id;
    profileId = approvalEvent.profile_id;
  }

  const resolvedProductId = productId ?? approvalEvent?.kiwify_product_id ?? null;

  if (!enrollmentId && resolvedProductId) {
    const { data: mapping } = await admin
      .from("kiwify_product_mappings")
      .select("edital_id, cargo_id")
      .eq("kiwify_product_id", resolvedProductId)
      .maybeSingle();

    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (mapping && profile) {
      const { data: enrollment } = await admin
        .from("member_edital_enrollments")
        .select("id")
        .eq("member_id", profile.id)
        .eq("edital_id", mapping.edital_id)
        .eq("cargo_id", mapping.cargo_id)
        .maybeSingle();

      enrollmentId = enrollment?.id ?? null;
      profileId = profile.id;
    }
  }

  if (!enrollmentId) {
    await admin.from("kiwify_order_events").insert({
      order_id: orderId,
      webhook_event_type: eventType,
      order_status: payload.order_status ?? null,
      customer_email: email,
      kiwify_product_id: resolvedProductId,
      payload,
    });
    return {
      ok: true,
      orderId,
      skipped: true,
      reason: "Nenhuma inscrição encontrada para revogar.",
    };
  }

  const { error: deleteError } = await admin
    .from("member_edital_enrollments")
    .delete()
    .eq("id", enrollmentId);

  if (deleteError) {
    return { ok: false, orderId, error: "Não foi possível revogar o acesso ao edital." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const emailResult = await sendRefundNoticeEmail({
    to: email,
    loginUrl: `${siteUrl.replace(/\/$/, "")}/login`,
    productName,
  });

  await admin.from("kiwify_access_emails").insert({
    profile_id: profileId,
    recipient_email: email,
    subject: "Acesso ao curso encerrado — Day Gomes",
    status: emailResult.ok ? "sent" : "failed",
    error_message: emailResult.ok ? null : emailResult.error,
    order_id: orderId,
  });

  await admin.from("kiwify_order_events").insert({
    order_id: orderId,
    webhook_event_type: eventType,
    order_status: payload.order_status ?? null,
    customer_email: email,
    kiwify_product_id: resolvedProductId,
    profile_id: profileId,
    enrollment_id: null,
    access_email_sent: emailResult.ok,
    created_user: false,
    payload,
  });

  return {
    ok: true,
    orderId,
    reason: emailResult.ok ? undefined : `Acesso revogado, e-mail não enviado: ${emailResult.error}`,
  };
}
