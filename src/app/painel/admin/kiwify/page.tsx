import { redirect } from "next/navigation";
import { KiwifyMappingForm } from "@/components/painel/kiwify-mapping-form";
import { KiwifyMappingList } from "@/components/painel/kiwify-mapping-list";
import { KiwifyOrdersPanel } from "@/components/painel/kiwify-orders-panel";
import { PainelPage } from "@/components/painel/painel-page";
import { getCurrentProfile } from "@/lib/auth/profile";
import { normalizeCorrectionQuota } from "@/lib/editais/enrollment-quota";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminKiwifyPage() {
  const { profile } = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/painel");

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://seu-dominio.com";
  const webhookToken = process.env.KIWIFY_WEBHOOK_TOKEN ? "configurado" : "pendente";

  const { data: editais } = await supabase
    .from("editais")
    .select("id, title, default_correction_quota")
    .order("created_at", { ascending: false });

  const editalOptions = (editais ?? []).map((edital) => ({
    id: edital.id,
    title: edital.title,
    defaultCorrectionQuota: normalizeCorrectionQuota(edital.default_correction_quota),
  }));

  const { data: mappings } = await supabase
    .from("kiwify_product_mappings")
    .select(
      "kiwify_product_id, kiwify_product_name, is_active, correction_quota, edital_id, editais(title)",
    )
    .order("created_at", { ascending: false });

  const mappingRows = (mappings ?? []).map((row) => {
    const edital = Array.isArray(row.editais) ? row.editais[0] : row.editais;
    return {
      kiwify_product_id: row.kiwify_product_id,
      kiwify_product_name: row.kiwify_product_name,
      is_active: row.is_active,
      correction_quota: row.correction_quota,
      edital_id: row.edital_id,
      editalTitle: edital?.title ?? "—",
    };
  });

  const { data: orders } = await supabase
    .from("kiwify_order_events")
    .select(
      "order_id, webhook_event_type, customer_email, access_email_sent, created_user, processed_at, profile_id, enrollment_id, kiwify_product_id",
    )
    .order("processed_at", { ascending: false })
    .limit(20);

  const orderIds = (orders ?? []).map((o) => o.order_id);
  const { data: emailLogs } = orderIds.length
    ? await supabase
        .from("kiwify_access_emails")
        .select("order_id, status, error_message")
        .in("order_id", orderIds)
    : { data: [] as { order_id: string | null; status: string; error_message: string | null }[] };

  const emailErrorByOrder = new Map(
    (emailLogs ?? []).map((row) => [row.order_id, row.error_message]),
  );

  type OrderRow = NonNullable<typeof orders>[number];

  function describeOrder(order: OrderRow) {
    const linked = Boolean(order.profile_id && order.enrollment_id);
    const userLabel = !linked
      ? "acesso não liberado (produto sem mapeamento ou inativo)"
      : order.created_user
        ? "conta criada neste pedido"
        : "conta já existia (ex.: outro pedido do mesmo e-mail)";

    let emailLabel: string;
    if (!linked) {
      emailLabel = "e-mail não tentado";
    } else if (order.access_email_sent) {
      emailLabel = "e-mail enviado";
    } else {
      const err = emailErrorByOrder.get(order.order_id);
      emailLabel = err ? `e-mail falhou (${err})` : "e-mail falhou";
    }

    return { userLabel, emailLabel, linked };
  }

  const orderListItems = (orders ?? []).map((order) => {
    const { userLabel, emailLabel, linked } = describeOrder(order);
    return {
      orderId: order.order_id,
      webhookEventType: order.webhook_event_type,
      customerEmail: order.customer_email,
      kiwifyProductId: order.kiwify_product_id,
      emailLabel,
      userLabel,
      linked,
      accessEmailSent: order.access_email_sent,
    };
  });

  const { count: unlinkedTotal } = await supabase
    .from("kiwify_order_events")
    .select("*", { count: "exact", head: true })
    .is("profile_id", null)
    .in("webhook_event_type", ["order_approved", "compra_aprovada"]);

  const unlinkedCount = unlinkedTotal ?? 0;

  const webhookUrl = `${siteUrl.replace(/\/$/, "")}/api/webhooks/kiwify?token=SEU_TOKEN`;

  return (
    <PainelPage gap="lg">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Kiwify</h1>
        <p className="mt-2 text-muted">
          Compra aprovada na Kiwify cria/libera o membro no edital e envia e-mail de acesso.
        </p>
      </div>

      <section className="panel-card">
        <h2 className="panel-title">Webhook</h2>
        <p className="mt-3 text-sm text-muted">
          Na Kiwify, eventos <strong>compra_aprovada</strong>,{" "}
          <strong>compra_reembolsada</strong> e <strong>chargeback</strong> apontando para:
        </p>
        <code className="mt-2 block overflow-x-auto rounded-xl bg-black/30 p-3 text-xs">
          {webhookUrl}
        </code>
        <p className="mt-3 text-sm text-muted">
          Token no servidor: <strong>{webhookToken}</strong> (variável{" "}
          <code>KIWIFY_WEBHOOK_TOKEN</code>).
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="panel-card h-fit">
          <h2 className="panel-title">Mapear produto → edital</h2>
          <p className="mt-2 text-sm text-muted">
            Use o <code>product_id</code> que vem no webhook da Kiwify.
          </p>
          <div className="mt-4">
            <KiwifyMappingForm editais={editalOptions} />
          </div>
        </section>

        <section className="panel-card">
          <h2 className="panel-title">Mapeamentos cadastrados</h2>
          <div className="mt-4">
            <KiwifyMappingList mappings={mappingRows} editais={editalOptions} />
          </div>
        </section>
      </div>

      <section className="panel-card">
        <h2 className="panel-title">Últimos pedidos processados</h2>
        <div className="mt-4">
          <KiwifyOrdersPanel orders={orderListItems} unlinkedCount={unlinkedCount} />
        </div>
      </section>
    </PainelPage>
  );
}
