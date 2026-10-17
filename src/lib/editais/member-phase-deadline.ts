const MS_PER_DAY = 86_400_000;

export const DEFAULT_SUBMISSION_PERIOD_DAYS = 30;
export const MIN_SUBMISSION_PERIOD_DAYS = 1;
export const MAX_SUBMISSION_PERIOD_DAYS = 365;

export function normalizeSubmissionPeriodDays(value: unknown): number {
  const days = Number(value);
  if (!Number.isFinite(days)) return DEFAULT_SUBMISSION_PERIOD_DAYS;
  return Math.min(
    MAX_SUBMISSION_PERIOD_DAYS,
    Math.max(MIN_SUBMISSION_PERIOD_DAYS, Math.round(days)),
  );
}

export function daysPerPhaseInCargo(
  submissionPeriodDays: number,
  phasesInCargo: number,
): number {
  const days = normalizeSubmissionPeriodDays(submissionPeriodDays);
  const phases = Math.max(1, phasesInCargo);
  return days / phases;
}

export function formatDaysPerPhase(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function phaseWindowMs(submissionPeriodDays: number, phasesInCargo: number): number {
  return daysPerPhaseInCargo(submissionPeriodDays, phasesInCargo) * MS_PER_DAY;
}

export function computeMemberPhaseDeadline(
  unlockedAt: string | Date,
  submissionPeriodDays: number,
  phasesInCargo: number,
): Date {
  const startMs = new Date(unlockedAt).getTime();
  return new Date(startMs + phaseWindowMs(submissionPeriodDays, phasesInCargo));
}

export function computeMemberPhaseDeadlineIso(
  unlockedAt: string | Date,
  submissionPeriodDays: number,
  phasesInCargo: number,
): string {
  return computeMemberPhaseDeadline(unlockedAt, submissionPeriodDays, phasesInCargo).toISOString();
}

export function computeMemberPhaseDeadlineIsoByPhaseIndex(
  enrolledAt: string | Date,
  submissionPeriodDays: number,
  phasesInTrack: number,
  phaseNumber: number,
): string {
  const startMs = new Date(enrolledAt).getTime();
  const windowPerPhase = phaseWindowMs(submissionPeriodDays, phasesInTrack);
  const index = Math.max(1, phaseNumber);
  return new Date(startMs + index * windowPerPhase).toISOString();
}

export function resolveMemberPhaseDeadlineAt(params: {
  unlockedAt?: string | null | undefined;
  enrolledAt?: string | null | undefined;
  phaseNumber?: number;
  submissionPeriodDays: number;
  phasesInCargo: number;
  legacyDeadlineAt?: string | null;
}): string {
  const anchor = params.enrolledAt ?? params.unlockedAt;
  if (anchor && params.phasesInCargo > 0) {
    if (params.enrolledAt && params.phaseNumber) {
      return computeMemberPhaseDeadlineIsoByPhaseIndex(
        params.enrolledAt,
        params.submissionPeriodDays,
        params.phasesInCargo,
        params.phaseNumber,
      );
    }
    return computeMemberPhaseDeadlineIso(
      anchor,
      params.submissionPeriodDays,
      params.phasesInCargo,
    );
  }
  if (params.legacyDeadlineAt) {
    return params.legacyDeadlineAt;
  }
  return new Date(0).toISOString();
}

export function isMemberPhaseDeadlineExpired(deadlineAt: string, nowMs = Date.now()): boolean {
  return new Date(deadlineAt).getTime() < nowMs;
}
