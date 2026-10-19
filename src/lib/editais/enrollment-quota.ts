import { createAdminClient } from "@/lib/supabase/admin";

/** Cota mínima ao inscrever manualmente pelo admin (sempre com correção). */
export const MIN_ADMIN_CORRECTION_QUOTA = 1;
/** Cota mínima em mapeamento Kiwify (mentoria só conteúdo). */
export const MIN_KIWIFY_CORRECTION_QUOTA = 0;
export const MAX_CORRECTION_QUOTA = 4;
/** Teto na inscrição quando o admin ajusta manualmente (alunos que já esgotaram o plano). */
export const MAX_ADMIN_ENROLLMENT_CORRECTION_QUOTA = 99;

/** Valor armazenado na inscrição ou exibido ao membro (0–4). */
export function normalizeCorrectionQuota(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(
    MAX_CORRECTION_QUOTA,
    Math.max(MIN_KIWIFY_CORRECTION_QUOTA, Math.round(n)),
  );
}

/** Cota gravada em `member_edital_enrollments` (0–99; admin pode aumentar além do plano Kiwify). */
export function normalizeEnrollmentCorrectionQuota(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(
    MAX_ADMIN_ENROLLMENT_CORRECTION_QUOTA,
    Math.max(MIN_KIWIFY_CORRECTION_QUOTA, Math.round(n)),
  );
}

/** Inscrição manual pelo admin (1–4). */
export function normalizeAdminEnrollmentQuota(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return MIN_ADMIN_CORRECTION_QUOTA;
  return Math.min(
    MAX_CORRECTION_QUOTA,
    Math.max(MIN_ADMIN_CORRECTION_QUOTA, Math.round(n)),
  );
}

/** Mapeamento de produto Kiwify (0–4). */
export function normalizeKiwifyMappingQuota(value: unknown): number {
  return normalizeCorrectionQuota(value);
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
  const safeQuota = normalizeEnrollmentCorrectionQuota(quota);
  const safeUsed = Math.max(0, Math.round(Number(used)) || 0);
  return Math.max(0, safeQuota - safeUsed);
}
