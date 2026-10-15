import { redirect } from "next/navigation";
import { MemberEditaisView, type MemberEnrollmentView } from "@/components/editais/member-editais-view";
import { PainelPage } from "@/components/painel/painel-page";
import { getAvatarPublicUrl, getCurrentProfile } from "@/lib/auth/profile";
import { getCorrectorPublicProfilesByIds } from "@/lib/corrector/batch-public-profiles";
import { listEditalAttachmentsByEditalIds } from "@/lib/editais/attachments";
import { computeEditalAverageByPhases } from "@/lib/editais/edital-phase-average";
import { parseSubmissionGrade } from "@/lib/editais/grades";
import {
  normalizeSubmissionPeriodDays,
  resolveMemberPhaseDeadlineAt,
} from "@/lib/editais/member-phase-deadline";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MembroEditaisPage() {
  const { user, profile } = await getCurrentProfile();
  if (!user || !profile) redirect("/login");
  if (profile.role !== "membro") redirect("/painel");

  const supabase = await createClient();
  const admin = createAdminClient();
  const { url: supabaseUrl } = getSupabasePublicEnv();
  const { data: enrollments } = await supabase
    .from("member_edital_enrollments")
    .select("id, edital_id, cargo_id, editais(title, submission_period_days), edital_cargos(name)")
    .eq("member_id", user.id);

  const editalIds = [...new Set((enrollments ?? []).map((row) => row.edital_id))];
  const attachmentsByEdital = await listEditalAttachmentsByEditalIds(editalIds);

  const views: MemberEnrollmentView[] = [];

  for (const enrollment of enrollments ?? []) {
    const edital = Array.isArray(enrollment.editais)
      ? enrollment.editais[0]
      : enrollment.editais;
    const cargo = Array.isArray(enrollment.edital_cargos)
      ? enrollment.edital_cargos[0]
      : enrollment.edital_cargos;

    const { data: accessRows } = await supabase
      .from("member_phase_access")
      .select("phase_id, unlocked_at")
      .eq("enrollment_id", enrollment.id);

    const unlockedAtByPhase = new Map(
      (accessRows ?? []).map((row) => [row.phase_id, row.unlocked_at as string]),
    );
    const phaseIds = (accessRows ?? []).map((row) => row.phase_id);
    const { data: phases } = phaseIds.length
      ? await supabase
          .from("edital_phases")
          .select("id, phase_number, title, description, deadline_at")
          .in("id", phaseIds)
          .order("phase_number")
      : { data: [] };

    const { data: submissions } = await admin
      .from("phase_submissions")
      .select("id, phase_id, status")
      .eq("enrollment_id", enrollment.id);

    const submissionByPhase = new Map(
      (submissions ?? []).map((item) => [item.phase_id, item]),
    );

    const submissionIds = (submissions ?? []).map((item) => item.id);
    const { data: corrections } = submissionIds.length
      ? await admin
          .from("phase_corrections")
          .select(
            "submission_id, grade, feedback, errors_notes, allow_resubmit, corrector_id",
          )
          .in("submission_id", submissionIds)
      : { data: [] };

    const correctionBySubmission = new Map(
      (corrections ?? []).map((item) => [item.submission_id, item]),
    );

    const correctorProfiles = await getCorrectorPublicProfilesByIds(
      (corrections ?? []).map((item) => item.corrector_id).filter(Boolean) as string[],
    );

    const { data: allCargoPhases } = await admin
      .from("edital_phases")
      .select("id")
      .eq("cargo_id", enrollment.cargo_id)
      .order("phase_number");

    const phasesInCargo = (allCargoPhases ?? []).length;
    const submissionPeriodDays = normalizeSubmissionPeriodDays(edital?.submission_period_days);

    const { average: averageGrade, phasesTotal } = computeEditalAverageByPhases(
      allCargoPhases ?? [],
      submissions ?? [],
      (corrections ?? []).map((item) => ({
        submission_id: item.submission_id,
        grade: item.grade,
        allow_resubmit: item.allow_resubmit,
      })),
    );

    views.push({
      id: enrollment.id,
      editalId: enrollment.edital_id,
      editalTitle: edital?.title ?? "Edital",
      cargoName: cargo?.name ?? "—",
      attachments: attachmentsByEdital.get(enrollment.edital_id) ?? [],
      phasesTotal,
      averageGrade,
      phases: (phases ?? []).map((phase) => {
        const submission = submissionByPhase.get(phase.id);
        const correction = submission
          ? correctionBySubmission.get(submission.id)
          : null;

        const correctorProfile = correction?.corrector_id
          ? correctorProfiles.get(correction.corrector_id)
          : null;

        return {
          id: phase.id,
          phaseNumber: phase.phase_number,
          title: phase.title,
          description: phase.description,
          deadlineAt: resolveMemberPhaseDeadlineAt({
            unlockedAt: unlockedAtByPhase.get(phase.id),
            submissionPeriodDays,
            phasesInCargo,
            legacyDeadlineAt: phase.deadline_at,
          }),
          submissionId: submission?.id ?? null,
          submissionStatus: submission?.status ?? null,
          allowResubmit: correction?.allow_resubmit ?? false,
          correction: correction
            ? {
                grade: parseSubmissionGrade(correction.grade),
                feedback: correction.feedback,
                errorsNotes: correction.errors_notes,
                correctorId: correction.corrector_id,
              }
            : null,
          corrector: correctorProfile
            ? {
                fullName: correctorProfile.fullName,
                avatarUrl: getAvatarPublicUrl(supabaseUrl, correctorProfile.avatarPath),
                bio: correctorProfile.bio,
              }
            : null,
        };
      }),
    });
  }

  if (!views.length) {
    return (
      <PainelPage>
        <h1 className="text-3xl font-semibold tracking-tight">Meus editais</h1>
        <p className="mt-4 text-muted">
          Você ainda não foi vinculado a nenhum edital. Aguarde o administrador.
        </p>
      </PainelPage>
    );
  }

  return (
    <PainelPage gap="lg">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Meus editais</h1>
        <p className="mt-2 text-muted">
          Cada fase liberada tem um prazo próprio (dias do edital divididos entre as fases). A
          próxima só abre após a correção.
        </p>
      </div>

      <MemberEditaisView enrollments={views} />
    </PainelPage>
  );
}
