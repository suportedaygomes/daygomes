import Link from "next/link";
import { redirect } from "next/navigation";
import { PainelPage } from "@/components/painel/painel-page";
import { getCurrentProfile } from "@/lib/auth/profile";
import { formatWhatsappDisplay } from "@/lib/support/validate";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  resolvido: "Resolvido",
};

export default async function SuporteAtendimentoPage() {
  const { profile } = await getCurrentProfile();
  if (!profile || (profile.role !== "corretor" && profile.role !== "admin")) {
    redirect("/painel");
  }

  const admin = createAdminClient();
  const { data: tickets } = await admin
    .from("support_tickets")
    .select("id, title, status, requester_name, requester_email, requester_whatsapp, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const openCount = (tickets ?? []).filter(
    (ticket) => ticket.status === "aberto" || ticket.status === "em_atendimento",
  ).length;

  return (
    <PainelPage>
      <h1 className="text-3xl font-semibold tracking-tight">Atendimento — Suporte</h1>
      <p className="mt-2 text-muted">
        {openCount} chamado{openCount === 1 ? "" : "s"} aguardando acompanhamento.
      </p>

      <ul className="-mt-4 grid gap-3 sm:grid-cols-2">
        {(tickets ?? []).map((ticket) => (
          <li key={ticket.id}>
            <Link
              href={`/painel/suporte/atendimento/${ticket.id}`}
              className="panel-card block transition hover:border-purple/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{ticket.title}</p>
                <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs">
                  {STATUS_LABEL[ticket.status] ?? ticket.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                {ticket.requester_name?.trim() || "Visitante"} · {ticket.requester_email}
              </p>
              <p className="mt-1 text-xs text-muted">
                WhatsApp {formatWhatsappDisplay(ticket.requester_whatsapp)} ·{" "}
                {new Date(ticket.created_at).toLocaleString("pt-BR")}
              </p>
            </Link>
          </li>
        ))}
        {!tickets?.length ? (
          <p className="text-sm text-muted">Nenhum chamado registrado.</p>
        ) : null}
      </ul>
    </PainelPage>
  );
}
