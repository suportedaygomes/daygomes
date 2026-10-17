import { createAdminClient } from "@/lib/supabase/admin";

export const MIN_CORRECTION_QUOTA = 1;
export const MAX_CORRECTION_QUOTA = 4;

export function normalizeCorrectionQuota(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return MIN_CORRECTION_QUOTA;
  return Math.min(MAX_CORRECTION_QUOTA, Math.max(MIN_CORRECTION_QUOTA, Math.round(n)));
}

export async function countEnrollmentSubmissionsUsed(enrollmentId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("phase_submissions")
    .select("*", { count: "exact", head: true })
    .eq("enrollment_id", enrollmentId);

  return count ?? 0;
}

export async function countEnrollmentChargedResubmitsUsed(
  enrollmentId: string,
): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("enrollment_correction_quota_charges")
    .select("*", { count: "exact", head: true })
    .eq("enrollment_id", enrollmentId);

  return count ?? 0;
}

/** Envios em fases distintas + reenvios pagos liberados pelo corretor. */
export async function countEnrollmentCorrectionQuotaUsed(
  enrollmentId: string,
): Promise<number> {
  const [submissions, charged] = await Promise.all([
    countEnrollmentSubmissionsUsed(enrollmentId),
    countEnrollmentChargedResubmitsUsed(enrollmentId),
  ]);
  return submissions + charged;
}

export function correctionsRemaining(quota: number, used: number) {
  return Math.max(0, normalizeCorrectionQuota(quota) - used);
}
