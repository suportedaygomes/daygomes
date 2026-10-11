import { isDefinitiveCorrection } from "@/lib/editais/correction-finalized";
import { parseSubmissionGrade } from "@/lib/editais/grades";

type PhaseRef = { id: string };

type SubmissionSlice = {
  id: string;
  phase_id: string;
  status: string;
};

type CorrectionSlice = {
  submission_id: string;
  grade?: unknown;
  allow_resubmit?: boolean | null;
};

/** Soma notas definitivas (fases sem nota contam como 0) ÷ total de fases do cargo. */
export function computeEditalAverageByPhases(
  allPhases: PhaseRef[],
  submissions: SubmissionSlice[],
  corrections: CorrectionSlice[],
): { average: number | null; phasesTotal: number; gradedPhases: number } {
  const phasesTotal = allPhases.length;
  if (!phasesTotal) {
    return { average: null, phasesTotal: 0, gradedPhases: 0 };
  }

  const submissionByPhase = new Map(submissions.map((item) => [item.phase_id, item]));
  const correctionBySubmission = new Map(
    corrections.map((item) => [item.submission_id, item]),
  );

  let sum = 0;
  let gradedPhases = 0;

  for (const phase of allPhases) {
    const submission = submissionByPhase.get(phase.id);
    const correction = submission
      ? correctionBySubmission.get(submission.id)
      : undefined;
    if (!submission || !isDefinitiveCorrection(submission, correction)) {
      continue;
    }
    gradedPhases += 1;
    sum += parseSubmissionGrade(correction?.grade) ?? 0;
  }

  const average =
    gradedPhases > 0 ? Math.round((sum / phasesTotal) * 10) / 10 : null;

  return { average, phasesTotal, gradedPhases };
}
