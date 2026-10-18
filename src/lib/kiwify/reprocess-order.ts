import { provisionKiwifyOrder } from "@/lib/kiwify/provision-access";
import type { KiwifyOrderWebhook } from "@/lib/kiwify/types";
import { isKiwifyOrderApproved } from "@/lib/kiwify/types";
import { createAdminClient } from "@/lib/supabase/admin";

const APPROVAL_EVENTS = ["order_approved", "compra_aprovada"];

function isApprovalEventType(webhookEventType: string | null | undefined) {
  const normalized = (webhookEventType ?? "").toLowerCase();
  return APPROVAL_EVENTS.includes(normalized);
}

export async function reprocessKiwifyOrderById(orderId: string) {
  const trimmed = orderId.trim();
  if (!trimmed) {
    return { ok: false as const, message: "Pedido inválido." };
  }

  const admin = createAdminClient();

  const { data: event, error: loadError } = await admin
    .from("kiwify_order_events")
    .select(
      "order_id, webhook_event_type, payload, profile_id, enrollment_id, access_email_sent",
    )
    .eq("order_id", trimmed)
    .maybeSingle();

  if (loadError || !event) {
    return { ok: false as const, message: "Pedido não encontrado." };
  }

  if (!isApprovalEventType(event.webhook_event_type)) {
    return {
      ok: false as const,
      message: "Só é possível reprocessar compras aprovadas.",
    };
  }

  const payload = event.payload as KiwifyOrderWebhook;
  if (!isKiwifyOrderApproved(payload)) {
    return { ok: false as const, message: "Payload do pedido não é de compra aprovada." };
  }

  const linked = Boolean(event.profile_id && event.enrollment_id);
  if (linked) {
    return {
      ok: false as const,
      message:
        "Este pedido já liberou acesso na plataforma. Use “Reenviar e-mail” se o aluno não recebeu.",
    };
  }

  const { error: deleteError } = await admin
    .from("kiwify_order_events")
    .delete()
    .eq("order_id", trimmed);

  if (deleteError) {
    return { ok: false as const, message: "Não foi possível preparar o reprocessamento." };
  }

  const result = await provisionKiwifyOrder(payload);
  if (!result.ok) {
    return { ok: false as const, message: result.error };
  }

  if (result.skipped) {
    return {
      ok: false as const,
      message: result.reason ?? "Pedido ignorado após reprocessar.",
    };
  }

  return {
    ok: true as const,
    message: result.emailSent
      ? "Pedido reprocessado e e-mail enviado."
      : `Pedido reprocessado. ${result.reason ?? "E-mail não enviado."}`,
    emailSent: result.emailSent ?? false,
  };
}

export async function reprocessUnlinkedKiwifyOrders(limit = 30) {
  const admin = createAdminClient();

  const { data: events, error } = await admin
    .from("kiwify_order_events")
    .select("order_id")
    .is("profile_id", null)
    .in("webhook_event_type", APPROVAL_EVENTS)
    .order("processed_at", { ascending: true })
    .limit(limit);

  if (error) {
    return { ok: false as const, message: "Não foi possível listar pedidos pendentes." };
  }

  const orderIds = (events ?? []).map((row) => row.order_id);
  if (!orderIds.length) {
    return { ok: true as const, processed: 0, failed: 0, message: "Nenhum pedido sem vínculo." };
  }

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const orderId of orderIds) {
    const result = await reprocessKiwifyOrderById(orderId);
    if (result.ok) {
      processed += 1;
    } else {
      failed += 1;
      if (errors.length < 5) {
        errors.push(`${orderId}: ${result.message}`);
      }
    }
  }

  return {
    ok: true as const,
    processed,
    failed,
    message:
      failed > 0
        ? `Reprocessados: ${processed}. Falhas: ${failed}. ${errors.join(" · ")}`
        : `Reprocessados com sucesso: ${processed}.`,
  };
}
