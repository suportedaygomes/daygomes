import Link from "next/link";
import { redirect } from "next/navigation";
import { PainelPage } from "@/components/painel/painel-page";
import { MemberResolveTicketButton } from "@/components/support/member-resolve-ticket-button";
import { SupportTicketThread } from "@/components/support/support-ticket-thread";
import { getCurrentProfile } from "@/lib/auth/profile";
import { formatTicketProtocol } from "@/lib/support/protocol";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  resolvido: "Resolvido",
};

export default async function MembroChamadoPage({
  params,
}: PageProps<"/painel/suporte/chamado/[id]">) {
  const { id } = await params;
  const { user, profile } = await getCurrentProfile();
  if (!user || !profile) redirect("/login");

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("support_tickets")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!ticket) redirect("/painel/suporte");

  const isStaff = profile.role === "corretor" || profile.role === "admin";
  if (!isStaff && ticket.member_id !== user.id) {
    redirect("/painel/suporte");
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

  const protocol = formatTicketProtocol(ticket.id);

  return (
    <PainelPage>
      <div>
        <Link href="/painel/suporte" className="text-sm text-muted hover:text-foreground">
          ← Voltar ao suporte
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{ticket.title}</h1>
        <p className="mt-2 text-sm text-muted">
          Protocolo {protocol} · {STATUS_LABEL[ticket.status] ?? ticket.status}
        </p>
      </div>

      <SupportTicketThread
        ticketId={ticket.id}
        createdAt={ticket.created_at}
        initialDescription={ticket.description}
        initialHasAttachment={Boolean(ticket.attachment_path)}
        replies={replies}
      />

      {!isStaff && ticket.status !== "resolvido" ? (
        <section className="panel-card">
          <h2 className="font-semibold">Problema resolvido?</h2>
          <p className="mt-2 text-sm text-muted">
            Se a resposta da equipe resolveu sua dúvida, você pode encerrar o chamado.
          </p>
          <div className="mt-4">
            <MemberResolveTicketButton ticketId={ticket.id} />
          </div>
        </section>
      ) : null}
    </PainelPage>
  );
}
