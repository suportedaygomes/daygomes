import { redirect } from "next/navigation";
import { MemberEditaisView, type MemberEnrollmentView } from "@/components/editais/member-editais-view";
import { PainelPage } from "@/components/painel/painel-page";
import { getAvatarPublicUrl, getCurrentProfile } from "@/lib/auth/profile";
import { getCorrectorPublicProfilesByIds } from "@/lib/corrector/batch-public-profiles";
import type { ActivityKind } from "@/lib/editais/activity-kind";
import { cargoDisplayName } from "@/lib/editais/activity-kind";
import { listEditalAttachmentsByEditalIds } from "@/lib/editais/attachments";
import { computeEditalAverageByPhases } from "@/lib/editais/edital-phase-average";
import {
  correctionsRemaining,
  countEnrollmentChargedResubmitsUsed,
  normalizeEnrollmentCorrectionQuota,
} from "@/lib/editais/enrollment-quota";
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
    .select("id, edital_id, correction_quota, created_at, editais(title, submission_period_days)")
    .eq("member_id", user.id);

  const editalIds = [...new Set((enrollments ?? []).map((row) => row.edital_id))];
  const attachmentsByEdital = await listEditalAttachmentsByEditalIds(editalIds);

  const { data: cargos } = editalIds.length
    ? await admin
        .from("edital_cargos")
        .select("id, edital_id, name, offers_dissertativa, offers_estudo_caso, sort_order")
        .in("edital_id", editalIds)
        .order("sort_order")
    : { data: [] };

  const cargoIds = (cargos ?? []).map((c) => c.id);
  const { data: allPhases } = cargoIds.length
    ? await admin
        .from("edital_phases")
        .select("id, cargo_id, activity_kind, phase_number, title, description, deadline_at")
        .in("cargo_id", cargoIds)
        .order("phase_number")
    : { data: [] };

  const views: MemberEnrollmentView[] = [];

  for (const enrollment of enrollments ?? []) {
    const edital = Array.isArray(enrollment.editais)
      ? enrollment.editais[0]
      : enrollment.editais;

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
            "submission_id, grade, feedback, errors_notes, allow_resubmit, resubmit_charges_quota, corrector_id",
          )
          .in("submission_id", submissionIds)
      : { data: [] };

    const correctionBySubmission = new Map(
      (corrections ?? []).map((item) => [item.submission_id, item]),
    );

    const correctorProfiles = await getCorrectorPublicProfilesByIds(
      (corrections ?? []).map((item) => item.corrector_id).filter(Boolean) as string[],
    );

    const submissionPeriodDays = normalizeSubmissionPeriodDays(edital?.submission_period_days);
    const correctionQuota = normalizeEnrollmentCorrectionQuota(enrollment.correction_quota);
    const chargedResubmits = await countEnrollmentChargedResubmitsUsed(enrollment.id);
    const correctionsUsed = (submissions?.length ?? 0) + chargedResubmits;
    const remaining = correctionsRemaining(correctionQuota, correctionsUsed);

    const editalCargos = (cargos ?? []).filter((c) => c.edital_id === enrollment.edital_id);

    const tracks = editalCargos.flatMap((cargo) => {
      const kinds: ActivityKind[] = [];
      if (cargo.offers_dissertativa) kinds.push("dissertativa");
      if (cargo.offers_estudo_caso) kinds.push("estudo_caso");

      return kinds.map((activityKind) => {
        const trackPhases = (allPhases ?? []).filter(
          (p) => p.cargo_id === cargo.id && p.activity_kind === activityKind,
        );
        const phasesInTrack = trackPhases.length;

        return {
          trackKey: `${cargo.id}-${activityKind}`,
          cargoId: cargo.id,
          cargoName: cargo.name,
          activityKind,
          displayName: cargoDisplayName(cargo.name, activityKind),
          phases: trackPhases.map((phase) => {
            const submission = submissionByPhase.get(phase.id);
            const correction = submission
              ? correctionBySubmission.get(submission.id)
              : null;
            const correctorProfile = correction?.corrector_id
              ? correctorProfiles.get(correction.corrector_id)
              : null;

            const quotaBlocksNewUpload =
              !submission && remaining <= 0 && !correction?.allow_resubmit;

            return {
              id: phase.id,
              phaseNumber: phase.phase_number,
              title: phase.title,
              description: phase.description,
              deadlineAt: resolveMemberPhaseDeadlineAt({
                enrolledAt: enrollment.created_at,
                phaseNumber: phase.phase_number,
                submissionPeriodDays,
                phasesInCargo: phasesInTrack,
                legacyDeadlineAt: phase.deadline_at,
              }),
              submissionId: submission?.id ?? null,
              submissionStatus: submission?.status ?? null,
              allowResubmit: correction?.allow_resubmit ?? false,
              resubmitChargesQuota: correction?.resubmit_charges_quota ?? false,
              quotaBlocksNewUpload,
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
        };
      });
    });

    const allPhaseRows = (allPhases ?? []).filter((p) =>
      editalCargos.some((c) => c.id === p.cargo_id),
    );

    const { average: averageGrade, phasesTotal } = computeEditalAverageByPhases(
      allPhaseRows,
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
      correctionQuota,
      correctionsUsed,
      correctionsRemaining: remaining,
      attachments: attachmentsByEdital.get(enrollment.edital_id) ?? [],
      phasesTotal,
      averageGrade,
      tracks,
    });
  }

  if (!views.length) {
    return (
      <PainelPage>
        <h1 className="text-3xl font-semibold tracking-tight">Meus editais</h1>
        <p className="mt-4 text-muted">
          Você ainda não foi vinculado a nenhuma mentoria. Aguarde o administrador ou a compra na
          Kiwify.
        </p>
      </PainelPage>
    );
  }

  return (
    <PainelPage gap="lg">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Meus editais</h1>
        <p className="mt-2 text-muted">
          Escolha cargo, modalidade e tema dentro da sua cota. Com 4 envios e 5 temas possíveis, você
          decide quais 4 enviar; reenvio no mesmo tema só quando o corretor liberar.
        </p>
      </div>

      <MemberEditaisView enrollments={views} />
    </PainelPage>
  );
}
