import { redirect } from "next/navigation";
import { MemberPhaseCard } from "@/components/editais/member-phase-card";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EnrollmentView = {
  id: string;
  editalTitle: string;
  cargoName: string;
  phases: Array<{
    id: string;
    phaseNumber: number;
    title: string;
    description: string;
    deadlineAt: string;
    submitted: boolean;
    correction: {
      grade: number | null;
      feedback: string;
      errorsNotes: string;
    } | null;
  }>;
};

export default async function MembroEditaisPage() {
  const { user, profile } = await getCurrentProfile();
  if (!user || !profile) redirect("/login");
  if (profile.role !== "membro") redirect("/painel");

  const supabase = await createClient();
  const { data: enrollments } = await supabase
    .from("member_edital_enrollments")
    .select("id, editais(title), edital_cargos(name)")
    .eq("member_id", user.id);

  const views: EnrollmentView[] = [];

  for (const enrollment of enrollments ?? []) {
    const edital = Array.isArray(enrollment.editais)
      ? enrollment.editais[0]
      : enrollment.editais;
    const cargo = Array.isArray(enrollment.edital_cargos)
      ? enrollment.edital_cargos[0]
      : enrollment.edital_cargos;

    const { data: accessRows } = await supabase
      .from("member_phase_access")
      .select("phase_id")
      .eq("enrollment_id", enrollment.id);

    const phaseIds = (accessRows ?? []).map((row) => row.phase_id);
    const { data: phases } = phaseIds.length
      ? await supabase
          .from("edital_phases")
          .select("id, phase_number, title, description, deadline_at")
          .in("id", phaseIds)
          .order("phase_number")
      : { data: [] };

    const { data: submissions } = await supabase
      .from("phase_submissions")
      .select("id, phase_id")
      .eq("enrollment_id", enrollment.id);

    const submissionByPhase = new Map(
      (submissions ?? []).map((item) => [item.phase_id, item.id]),
    );

    const submissionIds = (submissions ?? []).map((item) => item.id);
    const { data: corrections } = submissionIds.length
      ? await supabase
          .from("phase_corrections")
          .select("submission_id, grade, feedback, errors_notes")
          .in("submission_id", submissionIds)
      : { data: [] };

    const correctionBySubmission = new Map(
      (corrections ?? []).map((item) => [item.submission_id, item]),
    );

    views.push({
      id: enrollment.id,
      editalTitle: edital?.title ?? "Edital",
      cargoName: cargo?.name ?? "—",
      phases: (phases ?? []).map((phase) => {
        const submissionId = submissionByPhase.get(phase.id);
        const correction = submissionId
          ? correctionBySubmission.get(submissionId)
          : null;

        return {
          id: phase.id,
          phaseNumber: phase.phase_number,
          title: phase.title,
          description: phase.description,
          deadlineAt: phase.deadline_at,
          submitted: Boolean(submissionId),
          correction: correction
            ? {
                grade: correction.grade,
                feedback: correction.feedback,
                errorsNotes: correction.errors_notes,
              }
            : null,
        };
      }),
    });
  }

  if (!views.length) {
    return (
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Meus editais</h1>
        <p className="mt-4 text-muted">
          Você ainda não foi vinculado a nenhum edital. Aguarde o administrador.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Meus editais</h1>
        <p className="mt-2 text-muted">
          Envie cada fase liberada dentro do prazo. A próxima fase só abre após correção.
        </p>
      </div>

      {views.map((enrollment) => (
        <section key={enrollment.id} className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold">{enrollment.editalTitle}</h2>
            <p className="text-sm text-muted">Cargo: {enrollment.cargoName}</p>
          </div>
          <div className="grid gap-4">
            {enrollment.phases.map((phase) => (
              <MemberPhaseCard
                key={phase.id}
                enrollmentId={enrollment.id}
                phaseId={phase.id}
                phaseNumber={phase.phaseNumber}
                title={phase.title}
                description={phase.description}
                deadlineAt={phase.deadlineAt}
                submitted={phase.submitted}
                correction={phase.correction}
              />
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
