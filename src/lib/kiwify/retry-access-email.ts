import { sendAccessEmail } from "@/lib/email/send-access-email";
import { SITE_DISPLAY_NAME } from "@/lib/legal/site";
import { createAdminClient } from "@/lib/supabase/admin";

export async function retryKiwifyAccessEmail(orderId: string) {
  const trimmed = orderId.trim();
  if (!trimmed) {
    return { ok: false as const, message: "Pedido inválido." };
  }

  const admin = createAdminClient();

  const { data: event } = await admin
    .from("kiwify_order_events")
    .select("order_id, customer_email, profile_id, enrollment_id, created_user, payload")
    .eq("order_id", trimmed)
    .maybeSingle();

  if (!event?.profile_id || !event.enrollment_id) {
    return { ok: false as const, message: "Pedido sem acesso liberado na plataforma." };
  }

  const email = event.customer_email?.trim().toLowerCase();
  if (!email) {
    return { ok: false as const, message: "E-mail do pedido não encontrado." };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", event.profile_id)
    .maybeSingle();

  const payload = event.payload as {
    Customer?: { full_name?: string; first_name?: string };
    Product?: { product_name?: string };
  };

  const fullName =
    profile?.full_name?.trim() ||
    payload.Customer?.full_name?.trim() ||
    payload.Customer?.first_name?.trim() ||
    "Aluno";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const emailResult = await sendAccessEmail({
    to: email,
    fullName,
    loginUrl: `${siteUrl.replace(/\/$/, "")}/login`,
    password: undefined,
    productName: payload.Product?.product_name,
  });

  await admin.from("kiwify_access_emails").insert({
    profile_id: event.profile_id,
    recipient_email: email,
    subject: `Novo curso liberado na ${SITE_DISPLAY_NAME}`,
    status: emailResult.ok ? "sent" : "failed",
    error_message: emailResult.ok ? null : emailResult.error,
    order_id: trimmed,
  });

  if (emailResult.ok) {
    await admin
      .from("kiwify_order_events")
      .update({ access_email_sent: true })
      .eq("order_id", trimmed);
  }

  if (!emailResult.ok) {
    return { ok: false as const, message: emailResult.error };
  }

  return { ok: true as const, message: "E-mail reenviado." };
}
