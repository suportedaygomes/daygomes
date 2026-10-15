import { redirect } from "next/navigation";
import { EditalAttachmentsAdmin } from "@/components/editais/edital-attachments-admin";
import { EditEditalForm } from "@/components/editais/edit-edital-form";
import { EditalEvaluationRubricAdmin } from "@/components/editais/edital-evaluation-rubric-admin";
import { parseEvaluationRubric } from "@/lib/editais/evaluation-rubric";
import { normalizeSubmissionPeriodDays } from "@/lib/editais/member-phase-deadline";
import { EnrollMemberForm } from "@/components/editais/enroll-member-form";
import { listEditalAttachments } from "@/lib/editais/attachments";
import { PainelPage } from "@/components/painel/painel-page";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditalDetailPage({ params }: PageProps<"/painel/admin/editais/[id]">) {
  const { id } = await params;
  const { profile } = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/painel");

  const supabase = await createClient();
  const { data: edital } = await supabase
    .from("editais")
    .select("id, title, evaluation_rubric, submission_period_days")
    .eq("id", id)
    .maybeSingle();

  if (!edital) redirect("/painel/admin/editais");

  const { data: cargos } = await supabase
    .from("edital_cargos")
    .select("id, name, vacancy_count, sort_order")
    .eq("edital_id", id)
    .order("sort_order");

  const cargoIds = (cargos ?? []).map((cargo) => cargo.id);
  const { data: phases } = cargoIds.length
    ? await supabase
        .from("edital_phases")
        .select("id, cargo_id, phase_number, title, description, deadline_at")
        .in("cargo_id", cargoIds)
        .order("phase_number")
    : { data: [] };

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "membro")
    .order("full_name");

  const { data: enrollments } = await supabase
    .from("member_edital_enrollments")
    .select("id, member_id, cargo_id, profiles(full_name, email), edital_cargos(name)")
    .eq("edital_id", id);

  const attachments = await listEditalAttachments(id);

  return (
    <PainelPage gap="lg">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{edital.title}</h1>
        <p className="mt-2 text-muted">
          Edite estrutura, quesitos e anexos abaixo. Membros vinculados no final da página.
        </p>
      </div>

      <EditalAttachmentsAdmin editalId={id} initialAttachments={attachments} />

      <EditEditalForm
        editalId={id}
        initialTitle={edital.title}
        initialSubmissionPeriodDays={normalizeSubmissionPeriodDays(
          edital.submission_period_days,
        )}
        initialCargos={(cargos ?? []).map((cargo) => ({
          id: cargo.id,
          name: cargo.name,
          vacancyCount: cargo.vacancy_count,
          phases: (phases ?? [])
            .filter((phase) => phase.cargo_id === cargo.id)
            .map((phase) => ({
              id: phase.id,
              title: phase.title,
              description: phase.description,
            })),
        }))}
      />

      <EditalEvaluationRubricAdmin
        editalId={id}
        initialRubric={parseEvaluationRubric(edital.evaluation_rubric)}
      />

      <section className="panel-card h-fit max-w-xl">
        <h2 className="panel-title">Vincular membro</h2>
        <div className="mt-4">
          <EnrollMemberForm
            editalId={id}
            members={members ?? []}
            cargos={(cargos ?? []).map((cargo) => ({ id: cargo.id, name: cargo.name }))}
          />
        </div>
      </section>

      <section>
        <h2 className="panel-title">Membros inscritos</h2>
        <div className="mt-4 flex flex-col gap-2">
          {(enrollments ?? []).map((row) => {
            const member = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
            const cargo = Array.isArray(row.edital_cargos)
              ? row.edital_cargos[0]
              : row.edital_cargos;
            return (
              <p key={row.id} className="text-sm">
                {member?.full_name ?? "—"} · {cargo?.name ?? "—"} ({member?.email ?? "—"})
              </p>
            );
          })}
          {!enrollments?.length ? (
            <p className="text-sm text-muted">Nenhum membro vinculado.</p>
          ) : null}
        </div>
      </section>
    </PainelPage>
  );
}
