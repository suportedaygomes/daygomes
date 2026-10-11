import Link from "next/link";
import { redirect } from "next/navigation";
import { PainelPage } from "@/components/painel/painel-page";
import { SupportRequestForm } from "@/components/support/support-request-form";
import { getCurrentProfile, getDisplayName } from "@/lib/auth/profile";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  resolvido: "Resolvido",
};

export default async function PainelSuportePage() {
  const { user, profile } = await getCurrentProfile();
  if (!user || !profile) redirect("/login");

  if (profile.role === "corretor" || profile.role === "admin") {
    redirect("/painel/suporte/atendimento");
  }

  const admin = createAdminClient();
  const { data: tickets } = await admin
    .from("support_tickets")
    .select("id, title, status, created_at")
    .eq("member_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const email = (profile.email ?? user.email ?? "").trim();
  const whatsapp = profile.whatsapp ?? "";

  return (
    <PainelPage>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Suporte</h1>
        <p className="mt-2 text-muted">Abra um chamado para a equipe.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <SupportRequestForm
        mode="member"
        defaults={{
          email,
          whatsapp,
          fullName: getDisplayName(user, profile),
        }}
      />

      <section className="panel-card h-full">
        <h2 className="text-lg font-semibold">Seus chamados recentes</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {(tickets ?? []).map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/painel/suporte/chamado/${ticket.id}`}
                className="block rounded-xl border border-white/10 bg-field/50 px-3 py-2 text-sm transition hover:border-purple/40"
              >
                <p className="font-medium">{ticket.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {STATUS_LABEL[ticket.status] ?? ticket.status} ·{" "}
                  {new Date(ticket.created_at).toLocaleString("pt-BR")}
                </p>
              </Link>
            </li>
          ))}
          {!tickets?.length ? (
            <p className="text-sm text-muted">Você ainda não abriu chamados.</p>
          ) : null}
        </ul>
      </section>
      </div>
    </PainelPage>
  );
}
