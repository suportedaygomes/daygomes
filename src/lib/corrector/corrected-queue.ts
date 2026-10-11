import type { ProfileRow } from "@/lib/auth/profile";
import { submissionMemberProfileEmbed } from "@/lib/corrector/submission-select";
import { unwrapSingle } from "@/lib/corrector/submission-row-utils";
import { createAdminClient } from "@/lib/supabase/admin";

export type CorrectedSubmissionListRow = {
  id: string;
  member_id: string;
  submitted_at: string;
  memberName: string;
  editalId: string;
  editalTitle: string;
  cargoId: string;
  cargoName: string;
  phaseTitle: string;
  phaseNumber: number | null;
  grade: number | null;
  correctedAt: string;
  correctorId: string;
  correctorName: string;
  allowResubmit: boolean;
};

const LIST_LIMIT = 300;

export async function listCorrectedSubmissionsForStaff(
  profile: Pick<ProfileRow, "id" | "role">,
): Promise<CorrectedSubmissionListRow[]> {
  const admin = createAdminClient();

  let correctionsQuery = admin
    .from("phase_corrections")
    .select(
      `submission_id, grade, corrector_id, updated_at, allow_resubmit, profiles!phase_corrections_corrector_id_fkey(full_name), phase_submissions!inner(id, member_id, status, submitted_at, ${submissionMemberProfileEmbed}, edital_phases(title, phase_number), member_edital_enrollments!phase_submissions_enrollment_id_fkey(edital_id, cargo_id, editais(title), edital_cargos(name)))`,
    )
    .eq("phase_submissions.status", "corrigido")
    .order("updated_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (profile.role === "corretor") {
    correctionsQuery = correctionsQuery.eq("corrector_id", profile.id);
  }

  const { data: rows, error } = await correctionsQuery;

  if (error) {
    throw new Error(`Histórico de correções: ${error.message}`);
  }

  return (rows ?? []).map((row) => {
    const corrector = unwrapSingle(row.profiles);
    const submission = unwrapSingle(row.phase_submissions);
    const member = submission ? unwrapSingle(submission.profiles) : null;
    const phase = submission ? unwrapSingle(submission.edital_phases) : null;
    const enrollment = submission
      ? unwrapSingle(submission.member_edital_enrollments)
      : null;
    const edital = enrollment ? unwrapSingle(enrollment.editais) : null;
    const cargo = enrollment ? unwrapSingle(enrollment.edital_cargos) : null;

    const gradeRaw = row.grade;
    const grade =
      gradeRaw === null || gradeRaw === undefined
        ? null
        : Number.parseFloat(String(gradeRaw));

    return {
      id: row.submission_id,
      member_id: submission?.member_id ?? "",
      submitted_at: submission?.submitted_at ?? "",
      memberName: member?.full_name ?? "Aluno",
      editalId: enrollment?.edital_id ?? "",
      editalTitle: edital?.title ?? "Edital",
      cargoId: enrollment?.cargo_id ?? "",
      cargoName: cargo?.name ?? "Cargo",
      phaseTitle: phase?.title ?? "Fase",
      phaseNumber: phase?.phase_number ?? null,
      grade: Number.isFinite(grade) ? grade : null,
      correctedAt: row.updated_at,
      correctorId: row.corrector_id,
      correctorName: corrector?.full_name ?? "Corretor",
      allowResubmit: row.allow_resubmit === true,
    };
  });
}
