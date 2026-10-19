import { resendMemberAccessWithNewPassword } from "@/lib/admin/resend-member-access";
import { createAdminClient } from "@/lib/supabase/admin";

/** Limite de envios em massa por dia (Resend free ~100/dia; reserva 30 para outros e-mails). */
export const BULK_MEMBER_ACCESS_EMAIL_DAILY_LIMIT = 70;

const SAO_PAULO_TZ = "America/Sao_Paulo";

export function todayInSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SAO_PAULO_TZ }).format(new Date());
}

async function getBulkSentToday(admin: ReturnType<typeof createAdminClient>, day: string) {
  const { data } = await admin
    .from("admin_email_daily_counters")
    .select("bulk_access_sent")
    .eq("day", day)
    .maybeSingle();

  return data?.bulk_access_sent ?? 0;
}

async function addBulkSentToday(
  admin: ReturnType<typeof createAdminClient>,
  day: string,
  increment: number,
) {
  if (increment <= 0) return;

  const current = await getBulkSentToday(admin, day);
  const next = current + increment;

  const { error } = await admin.from("admin_email_daily_counters").upsert(
    { day, bulk_access_sent: next },
    { onConflict: "day" },
  );

  if (error) {
    console.error("[bulk-access-email] counter upsert failed", error.message);
  }
}

async function buildLastSignInMap(admin: ReturnType<typeof createAdminClient>) {
  const map = new Map<string, boolean>();
  let page = 1;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;

    for (const user of data.users) {
      map.set(user.id, Boolean(user.last_sign_in_at));
    }

    if (data.users.length < 200) break;
    page += 1;
    if (page > 100) break;
  }

  return map;
}

export async function listEligibleBulkMemberAccessIds(): Promise<string[]> {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email")
    .eq("role", "membro")
    .eq("banned", false);

  if (!profiles?.length) return [];

  const { data: enrollments } = await admin
    .from("member_edital_enrollments")
    .select("member_id");

  const enrolledIds = new Set((enrollments ?? []).map((row) => row.member_id));

  const { data: sentRows } = await admin
    .from("kiwify_access_emails")
    .select("profile_id")
    .eq("status", "sent")
    .not("profile_id", "is", null);

  const hasSentEmail = new Set(
    (sentRows ?? []).map((row) => row.profile_id).filter(Boolean) as string[],
  );

  const signedIn = await buildLastSignInMap(admin);

  return profiles
    .filter((profile) => {
      if (!profile.email?.trim()) return false;
      if (!enrolledIds.has(profile.id)) return false;
      if (hasSentEmail.has(profile.id)) return false;
      if (signedIn.get(profile.id)) return false;
      return true;
    })
    .map((profile) => profile.id);
}

export type BulkMemberAccessEmailStatus = {
  dailyLimit: number;
  sentToday: number;
  remainingToday: number;
  eligibleCount: number;
  dayLabel: string;
};

export async function getBulkMemberAccessEmailStatus(): Promise<BulkMemberAccessEmailStatus> {
  const admin = createAdminClient();
  const dayLabel = todayInSaoPaulo();
  const sentToday = await getBulkSentToday(admin, dayLabel);
  const eligible = await listEligibleBulkMemberAccessIds();

  return {
    dailyLimit: BULK_MEMBER_ACCESS_EMAIL_DAILY_LIMIT,
    sentToday,
    remainingToday: Math.max(0, BULK_MEMBER_ACCESS_EMAIL_DAILY_LIMIT - sentToday),
    eligibleCount: eligible.length,
    dayLabel,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type BulkMemberAccessEmailRunResult =
  | {
      ok: true;
      sent: number;
      failed: number;
      skippedLimit: number;
      sentToday: number;
      remainingToday: number;
      eligibleRemaining: number;
      errors: string[];
    }
  | { ok: false; message: string };

export async function runBulkMemberAccessEmailSend(): Promise<BulkMemberAccessEmailRunResult> {
  if (!process.env.RESEND_API_KEY?.trim()) {
    return { ok: false, message: "RESEND_API_KEY não configurada no servidor." };
  }

  const admin = createAdminClient();
  const dayLabel = todayInSaoPaulo();
  const sentToday = await getBulkSentToday(admin, dayLabel);
  const remainingToday = Math.max(0, BULK_MEMBER_ACCESS_EMAIL_DAILY_LIMIT - sentToday);

  if (remainingToday <= 0) {
    return {
      ok: false,
      message: `Limite diário atingido (${BULK_MEMBER_ACCESS_EMAIL_DAILY_LIMIT} envios em massa hoje). Tente amanhã.`,
    };
  }

  const eligible = await listEligibleBulkMemberAccessIds();
  const batch = eligible.slice(0, remainingToday);

  if (!batch.length) {
    return {
      ok: false,
      message: "Nenhum membro elegível (já receberam e-mail, já entraram na plataforma ou sem inscrição).",
    };
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const memberId of batch) {
    const result = await resendMemberAccessWithNewPassword(memberId);
    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
      if (errors.length < 10) {
        errors.push(result.message);
      }
    }
    await sleep(200);
  }

  await addBulkSentToday(admin, dayLabel, sent);

  const eligibleAfter = await listEligibleBulkMemberAccessIds();
  const sentTodayAfter = await getBulkSentToday(admin, dayLabel);

  return {
    ok: true,
    sent,
    failed,
    skippedLimit: Math.max(0, eligible.length - batch.length),
    sentToday: sentTodayAfter,
    remainingToday: Math.max(0, BULK_MEMBER_ACCESS_EMAIL_DAILY_LIMIT - sentTodayAfter),
    eligibleRemaining: eligibleAfter.length,
    errors,
  };
}
