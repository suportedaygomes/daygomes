import { redirect } from "next/navigation";
import { KiwifyMappingForm } from "@/components/painel/kiwify-mapping-form";
import { PainelPage } from "@/components/painel/painel-page";
import { getCurrentProfile } from "@/lib/auth/profile";
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
    .select("id, title")
    .order("created_at", { ascending: false });

  const editalOptions = (editais ?? []).map((edital) => ({
    id: edital.id,
    title: edital.title,
  }));

  const { data: mappings } = await supabase
    .from("kiwify_product_mappings")
    .select(
      "kiwify_product_id, kiwify_product_name, is_active, correction_quota, editais(title)",
    )
    .order("created_at", { ascending: false });

  const { data: orders } = await supabase
    .from("kiwify_order_events")
    .select(
      "order_id, webhook_event_type, customer_email, access_email_sent, created_user, processed_at",
    )
    .order("processed_at", { ascending: false })
    .limit(20);

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
          <h2 className="panel-title">Mapeamentos ativos</h2>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {(mappings ?? []).map((row) => {
              const edital = Array.isArray(row.editais) ? row.editais[0] : row.editais;
              return (
                <li key={row.kiwify_product_id} className="rounded-xl border border-white/8 p-3">
                  <p className="font-medium">{row.kiwify_product_name ?? row.kiwify_product_id}</p>
                  <p className="text-muted">
                    {edital?.title ?? "—"} · {row.correction_quota} correção(ões)
                  </p>
                </li>
              );
            })}
            {!mappings?.length ? (
              <li className="text-muted">Nenhum mapeamento cadastrado.</li>
            ) : null}
          </ul>
        </section>
      </div>

      <section className="panel-card">
        <h2 className="panel-title">Últimos pedidos processados</h2>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {(orders ?? []).map((order) => (
            <li key={order.order_id} className="text-muted">
              {order.order_id} · {order.webhook_event_type} · {order.customer_email} · e-mail{" "}
              {order.access_email_sent ? "enviado" : "falhou"} ·{" "}
              {order.created_user ? "usuário novo" : "usuário existente"}
            </li>
          ))}
          {!orders?.length ? <li className="text-muted">Nenhum pedido ainda.</li> : null}
        </ul>
      </section>
    </PainelPage>
  );
}
