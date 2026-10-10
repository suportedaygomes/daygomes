import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CorrecoesPage() {
  const { profile } = await getCurrentProfile();
  if (!profile || (profile.role !== "corretor" && profile.role !== "admin")) {
    redirect("/painel");
  }

  const supabase = await createClient();
  const { data: submissions } = await supabase
    .from("phase_submissions")
    .select(
      "id, status, submitted_at, profiles(full_name), edital_phases(title, phase_number)",
    )
    .in("status", ["enviado", "em_correcao"])
    .order("submitted_at", { ascending: true });

  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">Correções</h1>
      <p className="mt-2 text-muted">
        Corrija as redações enviadas e libere a próxima fase quando estiver pronto.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {(submissions ?? []).map((submission) => {
          const member = Array.isArray(submission.profiles)
            ? submission.profiles[0]
            : submission.profiles;
          const phase = Array.isArray(submission.edital_phases)
            ? submission.edital_phases[0]
            : submission.edital_phases;

          return (
            <Link
              key={submission.id}
              href={`/painel/correcoes/${submission.id}`}
              className="panel-card transition hover:border-purple/40"
            >
              <p className="font-semibold">{member?.full_name ?? "Aluno"}</p>
              <p className="mt-1 text-sm text-muted">
                {phase?.title ?? "Fase"} · Fase {phase?.phase_number ?? "—"}
              </p>
              <p className="mt-2 text-xs text-muted">
                Enviado em {new Date(submission.submitted_at).toLocaleString("pt-BR")}
              </p>
            </Link>
          );
        })}
        {!submissions?.length ? (
          <p className="text-sm text-muted">Nenhum envio pendente de correção.</p>
        ) : null}
      </div>
    </section>
  );
}
