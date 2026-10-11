export type PhaseSubmissionRow = {
  status: string;
};

export function memberNeedsPhaseSubmission(
  submission: PhaseSubmissionRow | null | undefined,
  allowResubmit: boolean,
): boolean {
  if (!submission) return true;
  if (submission.status === "enviado" || submission.status === "em_correcao") {
    return false;
  }
  if (submission.status === "corrigido") {
    return allowResubmit;
  }
  return true;
}

export const MS_PER_DAY = 86_400_000;

export function daysUntilDeadline(deadlineAt: string | Date, nowMs = Date.now()): number {
  const deadlineMs = new Date(deadlineAt).getTime();
  return Math.floor((deadlineMs - nowMs) / MS_PER_DAY);
}

export type ReminderKind = "7_days" | "1_day";

export function reminderKindForDaysLeft(daysLeft: number): ReminderKind | null {
  if (daysLeft === 7) return "7_days";
  if (daysLeft === 1) return "1_day";
  return null;
}
