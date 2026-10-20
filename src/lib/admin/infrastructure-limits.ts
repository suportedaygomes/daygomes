/** Limites padrão (planos gratuitos / tier inicial). Ajuste via env na Vercel. */

const MB = 1024 * 1024;
const GB = 1024 * MB;

function parsePositiveInt(env: string | undefined, fallback: number) {
  const n = Number(env);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.round(n);
}

export function getResendDailyLimit() {
  return parsePositiveInt(process.env.INFRA_RESEND_DAILY_LIMIT, 100);
}

export function getResendMonthlyLimit() {
  return parsePositiveInt(process.env.INFRA_RESEND_MONTHLY_LIMIT, 3_000);
}

/** Plano gratuito Supabase: ~500 MB de banco. */
export function getSupabaseDatabaseLimitBytes() {
  return parsePositiveInt(process.env.INFRA_SUPABASE_DB_LIMIT_MB, 500) * MB;
}

/** Armazenamento de arquivos no Supabase Storage (se usar). */
export function getSupabaseStorageLimitBytes() {
  return parsePositiveInt(process.env.INFRA_SUPABASE_STORAGE_LIMIT_MB, 1024) * MB;
}

/** R2 gratuito: 10 GB-mês de armazenamento (sem cobrança até o limite do plano). */
export function getR2StorageLimitBytes() {
  return parsePositiveInt(process.env.INFRA_R2_STORAGE_LIMIT_GB, 10) * GB;
}
