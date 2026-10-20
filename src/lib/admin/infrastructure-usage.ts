import {
  getR2StorageLimitBytes,
  getResendDailyLimit,
  getResendMonthlyLimit,
  getSupabaseDatabaseLimitBytes,
  getSupabaseStorageLimitBytes,
} from "@/lib/admin/infrastructure-limits";
import { todayInSaoPaulo } from "@/lib/admin/sao-paulo-day";
import { getResendDailyUsage } from "@/lib/admin/resend-platform-usage";
import { isEmailConfigured } from "@/lib/email/resend";
import { measureR2BucketUsage } from "@/lib/r2/bucket-usage";
import { createAdminClient } from "@/lib/supabase/admin";

export type UsageMetric = {
  label: string;
  used: number;
  limit: number;
  unit: "count" | "bytes";
  detail?: string;
  warning?: string;
};

export type ServiceUsageBlock = {
  id: "resend" | "supabase" | "r2";
  title: string;
  configured: boolean;
  dashboardUrl: string;
  metrics: UsageMetric[];
  notes: string[];
};

export type InfrastructureUsageReport = {
  fetchedAt: string;
  services: ServiceUsageBlock[];
};

function monthBoundsSaoPaulo() {
  const dayLabel = todayInSaoPaulo();
  const [y, m] = dayLabel.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01T00:00:00-03:00`;
  const nextMonth = m === 12 ? { year: y + 1, month: 1 } : { year: y, month: m + 1 };
  const end = `${nextMonth.year}-${String(nextMonth.month).padStart(2, "0")}-01T00:00:00-03:00`;
  return { start, end, dayLabel };
}

async function countAuthUsers(admin: ReturnType<typeof createAdminClient>) {
  let total = 0;
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return { total: 0, error: error.message };
    total += data.users.length;
    if (data.users.length < 200) break;
    page += 1;
    if (page > 100) break;
  }
  return { total };
}

async function sumBulkEmailsThisMonth(admin: ReturnType<typeof createAdminClient>) {
  const { start, end } = monthBoundsSaoPaulo();
  const startDay = start.slice(0, 10);
  const endDay = end.slice(0, 10);

  const { data } = await admin
    .from("admin_email_daily_counters")
    .select("day, bulk_access_sent")
    .gte("day", startDay)
    .lt("day", endDay);

  return (data ?? []).reduce((sum, row) => sum + (row.bulk_access_sent ?? 0), 0);
}

async function countPlatformEmailsSent(
  admin: ReturnType<typeof createAdminClient>,
  fromIso: string,
  toIso: string,
) {
  const { count } = await admin
    .from("kiwify_access_emails")
    .select("*", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("created_at", fromIso)
    .lt("created_at", toIso);

  return count ?? 0;
}

async function measureSupabaseStorageBytes(admin: ReturnType<typeof createAdminClient>) {
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error || !buckets?.length) {
    return { bytes: 0, error: error?.message };
  }

  let bytes = 0;

  async function walk(bucketId: string, prefix: string) {
    const { data: items, error: listError } = await admin.storage.from(bucketId).list(prefix, {
      limit: 1000,
    });
    if (listError || !items) return;

    for (const item of items) {
      if (!item.name) continue;
      const isFolder = item.id === null || item.metadata === null;
      if (isFolder) {
        const nextPrefix = prefix ? `${prefix}/${item.name}` : item.name;
        await walk(bucketId, nextPrefix);
        continue;
      }
      const size = item.metadata?.size;
      if (typeof size === "number") bytes += size;
    }
  }

  for (const bucket of buckets) {
    await walk(bucket.id, "");
  }

  return { bytes };
}

function usagePercent(used: number, limit: number) {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function warningForPercent(percent: number) {
  if (percent >= 95) return "critical";
  if (percent >= 80) return "high";
  if (percent >= 60) return "medium";
  return undefined;
}

export async function loadInfrastructureUsageReport(): Promise<InfrastructureUsageReport> {
  const admin = createAdminClient();
  const { start, end, dayLabel } = monthBoundsSaoPaulo();

  const [
    emailsMonth,
    resendUsage,
    bulkMonth,
    bulkTodayRow,
    r2Usage,
    dbSizeResult,
    storageResult,
    authUsers,
  ] = await Promise.all([
    countPlatformEmailsSent(admin, start, end),
    getResendDailyUsage(admin),
    sumBulkEmailsThisMonth(admin),
    admin
      .from("admin_email_daily_counters")
      .select("bulk_access_sent")
      .eq("day", dayLabel)
      .maybeSingle(),
    measureR2BucketUsage(),
    admin.rpc("admin_report_database_size_bytes"),
    measureSupabaseStorageBytes(admin),
    countAuthUsers(admin),
  ]);

  const bulkToday = bulkTodayRow.data?.bulk_access_sent ?? 0;
  const platformEmailsMonth = emailsMonth;
  const platformEmailsToday = resendUsage.accessEmailsSent;

  const resendDailyLimit = getResendDailyLimit();
  const resendMonthlyLimit = getResendMonthlyLimit();
  const dailyPercent = usagePercent(platformEmailsToday, resendDailyLimit);
  const monthlyPercent = usagePercent(platformEmailsMonth, resendMonthlyLimit);

  const dbSizeError = dbSizeResult.error;
  const dbBytes =
    typeof dbSizeResult.data === "number"
      ? dbSizeResult.data
      : typeof dbSizeResult.data === "string"
        ? Number(dbSizeResult.data)
        : 0;
  const dbLimit = getSupabaseDatabaseLimitBytes();
  const dbPercent = usagePercent(dbBytes, dbLimit);

  const storageBytes = storageResult.bytes ?? 0;
  const storageLimit = getSupabaseStorageLimitBytes();
  const storagePercent = usagePercent(storageBytes, storageLimit);

  const r2Limit = getR2StorageLimitBytes();
  const r2Percent = r2Usage.totalBytes > 0 ? usagePercent(r2Usage.totalBytes, r2Limit) : 0;

  const supabaseRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
    /https:\/\/([^.]+)\.supabase\.co/,
  )?.[1];

  const r2AccountId = process.env.R2_ACCOUNT_ID?.trim();

  const services: ServiceUsageBlock[] = [
    {
      id: "resend",
      title: "Resend (e-mails transacionais)",
      configured: isEmailConfigured(),
      dashboardUrl: "https://resend.com/emails",
      metrics: [
        {
          label: "E-mails de acesso enviados hoje (Resend)",
          used: platformEmailsToday,
          limit: resendDailyLimit,
          unit: "count",
          detail: `Inclui lote em massa (${bulkToday} hoje). Restam ~${resendUsage.remainingTotal} no limite diário.`,
          warning: warningForPercent(dailyPercent),
        },
        {
          label: "E-mails de acesso no mês",
          used: platformEmailsMonth,
          limit: resendMonthlyLimit,
          unit: "count",
          detail: `Envios em massa no mês: ${bulkMonth} (já contados nos acessos).`,
          warning: warningForPercent(monthlyPercent),
        },
      ],
      notes: [
        "Correções, suporte e lembretes também usam o Resend e não entram nesta contagem.",
        "No Resend, status “Sent” = aceito; “Delivered” = chegou na caixa (pode demorar minutos).",
        "Confira o painel do Resend para o total exato. Plano gratuito: ~100/dia e 3.000/mês (INFRA_RESEND_*).",
      ],
    },
    {
      id: "supabase",
      title: "Supabase (banco e auth)",
      configured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
      dashboardUrl: supabaseRef
        ? `https://supabase.com/dashboard/project/${supabaseRef}/settings/infrastructure`
        : "https://supabase.com/dashboard",
      metrics: [
        {
          label: "Tamanho do banco PostgreSQL",
          used: dbBytes,
          limit: dbLimit,
          unit: "bytes",
          detail: dbSizeError
            ? `Não foi possível ler o tamanho: ${dbSizeError.message}. Aplique a migration admin_report_database_size_bytes.`
            : undefined,
          warning: dbSizeError ? "critical" : warningForPercent(dbPercent),
        },
        {
          label: "Arquivos no Storage (Supabase)",
          used: storageBytes,
          limit: storageLimit,
          unit: "bytes",
          detail: storageResult.error
            ? `Storage: ${storageResult.error}`
            : "Envios de alunos usam Cloudflare R2; este valor é o Storage nativo do Supabase.",
          warning: warningForPercent(storagePercent),
        },
        {
          label: "Usuários no Auth",
          used: authUsers.total,
          limit: 50_000,
          unit: "count",
          detail: authUsers.error ? `Erro ao contar: ${authUsers.error}` : "Limite típico do plano gratuito: 50.000 MAU.",
          warning: warningForPercent(usagePercent(authUsers.total, 50_000)),
        },
      ],
      notes: [
        "Egress (bandwidth) e outros limites aparecem no painel do Supabase → Settings → Infrastructure.",
        "Ajuste INFRA_SUPABASE_DB_LIMIT_MB e INFRA_SUPABASE_STORAGE_LIMIT_MB se mudar de plano.",
      ],
    },
    {
      id: "r2",
      title: "Cloudflare R2 (arquivos)",
      configured: r2Usage.configured,
      dashboardUrl: r2AccountId
        ? `https://dash.cloudflare.com/${r2AccountId}/r2/overview`
        : "https://dash.cloudflare.com/?to=/:account/r2/overview",
      metrics: [
        {
          label: "Armazenamento no bucket",
          used: r2Usage.totalBytes,
          limit: r2Limit,
          unit: "bytes",
          detail: r2Usage.error
            ? r2Usage.error
            : `Bucket: ${r2Usage.bucket} · ${r2Usage.objectCount} objeto(s)`,
          warning: r2Usage.error ? "critical" : warningForPercent(r2Percent),
        },
        {
          label: "Objetos no bucket",
          used: r2Usage.objectCount,
          limit: 1_000_000,
          unit: "count",
          detail: "Operações Class A/B (leituras/gravações) são cobradas no plano; veja o painel R2 → Metrics.",
          warning: undefined,
        },
      ],
      notes: [
        "Plano gratuito R2: ~10 GB de armazenamento e milhões de operações/mês (confira a Cloudflare).",
        "Ajuste INFRA_R2_STORAGE_LIMIT_GB se mudar de plano.",
      ],
    },
  ];

  return {
    fetchedAt: new Date().toISOString(),
    services,
  };
}
