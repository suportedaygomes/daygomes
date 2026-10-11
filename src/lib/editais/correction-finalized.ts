import { parseSubmissionGrade } from "@/lib/editais/grades";

type SubmissionSlice = { status: string } | null | undefined;

type CorrectionSlice = {
  allow_resubmit?: boolean | null;
  grade?: unknown;
} | null | undefined;

/** Correção publicada sem reenvio pendente — nota e contadores usam só este estado. */
export function isDefinitiveCorrection(
  submission: SubmissionSlice,
  correction: CorrectionSlice,
): boolean {
  if (!submission || !correction) return false;
  if (correction.allow_resubmit) return false;
  if (submission.status === "enviado" || submission.status === "em_correcao") {
    return false;
  }
  return parseSubmissionGrade(correction.grade) != null;
}

export function isSubmittedForCorrection(submission: SubmissionSlice): boolean {
  if (!submission) return false;
  return submission.status === "enviado" || submission.status === "em_correcao";
}
