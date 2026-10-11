import Link from "next/link";
import { redirect } from "next/navigation";
import { PainelPage } from "@/components/painel/painel-page";
import { WhatsAppNotifyButton } from "@/components/painel/whatsapp-notify-button";
import { SupportTicketReplyForm } from "@/components/support/support-ticket-reply-form";
import { SupportTicketThread } from "@/components/support/support-ticket-thread";
import { getCurrentProfile } from "@/lib/auth/profile";
import { formatTicketProtocol } from "@/lib/support/protocol";
import { supportReplyWhatsAppMessage } from "@/lib/support/whatsapp";
import { formatWhatsappDisplay } from "@/lib/support/validate";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  resolvido: "Resolvido",
};

export default async function SuporteAtendimentoDetailPage({
  params,
}: PageProps<"/painel/suporte/atendimento/[id]">) {
  const { id } = await params;
  const { profile } = await getCurrentProfile();
  if (!profile || (profile.role !== "corretor" && profile.role !== "admin")) {
    redirect("/painel");
  }

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("support_tickets")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!ticket) {
    redirect("/painel/suporte/atendimento");
  }

  const { data: replyRows } = await admin
    .from("support_ticket_replies")
    .select("id, body, created_at, attachment_path, profiles(full_name)")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  const replies = (replyRows ?? []).map((row) => {
    const author = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      body: row.body,
      created_at: row.created_at,
      author_name: author?.full_name ?? null,
      has_attachment: Boolean(row.attachment_path),
    };
  });

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const ticketUrl = `${siteUrl}/painel/suporte/chamado/${id}`;
  const protocol = formatTicketProtocol(id);
  const whatsAppMessage = supportReplyWhatsAppMessage({ ticketId: id, ticketUrl });
  const hasReplies = replies.length > 0;

  return (
    <PainelPage>
      <div>
        <Link
          href="/painel/suporte/atendimento"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Voltar aos chamados
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{ticket.title}</h1>
        <p className="mt-2 text-sm text-muted">
          Protocolo {protocol} · {STATUS_LABEL[ticket.status] ?? ticket.status} ·{" "}
          {new Date(ticket.created_at).toLocaleString("pt-BR")}
        </p>
      </div>

      <section className="panel-card text-sm">
        <h2 className="font-semibold">Contato</h2>
        <dl className="mt-3 grid gap-2">
          <div>
            <dt className="text-muted">Nome</dt>
            <dd>{ticket.requester_name?.trim() || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">E-mail</dt>
            <dd>
              <a href={`mailto:${ticket.requester_email}`} className="text-purple hover:underline">
                {ticket.requester_email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-muted">WhatsApp</dt>
            <dd>{formatWhatsappDisplay(ticket.requester_whatsapp)}</dd>
          </div>
        </dl>
        {hasReplies ? (
          <div className="mt-4">
            <WhatsAppNotifyButton
              phone={ticket.requester_whatsapp}
              message={whatsAppMessage}
              className="w-full sm:w-auto"
            />
            <p className="mt-2 text-xs text-muted">
              Abre o WhatsApp Web com o protocolo {protocol} e o aviso de resposta.
            </p>
          </div>
        ) : null}
      </section>

      <SupportTicketThread
        ticketId={ticket.id}
        createdAt={ticket.created_at}
        initialDescription={ticket.description}
        initialHasAttachment={Boolean(ticket.attachment_path)}
        replies={replies}
      />

      {ticket.status !== "resolvido" ? (
        <SupportTicketReplyForm ticketId={ticket.id} />
      ) : (
        <p className="text-sm text-muted">Chamado encerrado. Não é possível enviar novas respostas.</p>
      )}
    </PainelPage>
  );
}
