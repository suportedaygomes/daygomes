import { getResendDailyUsage } from "@/lib/admin/resend-platform-usage";
import { todayInSaoPaulo } from "@/lib/admin/sao-paulo-day";
import { resendMemberAccessWithNewPassword } from "@/lib/admin/resend-member-access";
import { createAdminClient } from "@/lib/supabase/admin";

/** Limite de envios em massa por dia (Resend free ~100/dia; reserva 30 para outros e-mails). */
export const BULK_MEMBER_ACCESS_EMAIL_DAILY_LIMIT = 70;

export { todayInSaoPaulo };

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
    .select("id, email, full_name")
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

export type BulkMemberAccessTarget = {
  id: string;
  fullName: string;
  email: string;
};

export async function listEligibleBulkMemberAccessTargets(): Promise<BulkMemberAccessTarget[]> {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, full_name")
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
    .map((profile) => ({
      id: profile.id,
      fullName: profile.full_name?.trim() || "Aluno",
      email: profile.email!.trim(),
    }));
}

export type BulkMemberAccessBatchPlan =
  | {
      ok: true;
      targets: BulkMemberAccessTarget[];
      skippedByLimit: number;
    }
  | { ok: false; message: string };

export async function planBulkMemberAccessBatch(): Promise<BulkMemberAccessBatchPlan> {
  if (!process.env.RESEND_API_KEY?.trim()) {
    return { ok: false, message: "RESEND_API_KEY não configurada no servidor." };
  }

  const admin = createAdminClient();
  const dayLabel = todayInSaoPaulo();
  const sentToday = await getBulkSentToday(admin, dayLabel);
  const bulkRemaining = Math.max(0, BULK_MEMBER_ACCESS_EMAIL_DAILY_LIMIT - sentToday);
  const resendUsage = await getResendDailyUsage(admin);
  const remainingToday = Math.min(bulkRemaining, resendUsage.remainingForBulk);

  if (remainingToday <= 0) {
    if (resendUsage.remainingForBulk <= 0 && bulkRemaining > 0) {
      return {
        ok: false,
        message: `Limite diário do Resend atingido (${resendUsage.accessEmailsSent}/${resendUsage.limit} e-mails de acesso hoje). Tente amanhã ou aumente INFRA_RESEND_DAILY_LIMIT.`,
      };
    }
    return {
      ok: false,
      message: `Limite diário atingido (${BULK_MEMBER_ACCESS_EMAIL_DAILY_LIMIT} envios em massa hoje). Tente amanhã.`,
    };
  }

  const eligible = await listEligibleBulkMemberAccessTargets();
  const targets = eligible.slice(0, remainingToday);

  if (!targets.length) {
    return {
      ok: false,
      message: "Nenhum membro elegível (já receberam e-mail, já entraram na plataforma ou sem inscrição).",
    };
  }

  return {
    ok: true,
    targets,
    skippedByLimit: Math.max(0, eligible.length - targets.length),
  };
}

async function isMemberStillEligibleForBulk(
  admin: ReturnType<typeof createAdminClient>,
  memberId: string,
): Promise<boolean> {
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, role, banned")
    .eq("id", memberId)
    .maybeSingle();

  if (!profile || profile.role !== "membro" || profile.banned || !profile.email?.trim()) {
    return false;
  }

  const { data: enrollmentRows } = await admin
    .from("member_edital_enrollments")
    .select("member_id")
    .eq("member_id", memberId)
    .limit(1);

  if (!enrollmentRows?.length) return false;

  const { data: sentRow } = await admin
    .from("kiwify_access_emails")
    .select("id")
    .eq("profile_id", memberId)
    .eq("status", "sent")
    .limit(1)
    .maybeSingle();

  if (sentRow) return false;

  const { data: authUser } = await admin.auth.admin.getUserById(memberId);
  if (authUser.user?.last_sign_in_at) return false;

  return true;
}

export type BulkMemberAccessStepResult =
  | { ok: true; fullName: string; email: string; sentToday: number; remainingToday: number }
  | { ok: false; message: string };

export async function sendOneBulkMemberAccessEmail(memberId: string): Promise<BulkMemberAccessStepResult> {
  if (!process.env.RESEND_API_KEY?.trim()) {
    return { ok: false, message: "RESEND_API_KEY não configurada no servidor." };
  }

  const admin = createAdminClient();
  const dayLabel = todayInSaoPaulo();
  const sentToday = await getBulkSentToday(admin, dayLabel);
  const bulkRemaining = Math.max(0, BULK_MEMBER_ACCESS_EMAIL_DAILY_LIMIT - sentToday);
  const resendUsage = await getResendDailyUsage(admin);

  if (resendUsage.remainingForBulk <= 0) {
    return {
      ok: false,
      message: `Limite diário do Resend atingido (${resendUsage.accessEmailsSent}/${resendUsage.limit} e-mails de acesso hoje).`,
    };
  }

  if (bulkRemaining <= 0) {
    return {
      ok: false,
      message: `Limite diário de envios em massa atingido (${BULK_MEMBER_ACCESS_EMAIL_DAILY_LIMIT}/dia).`,
    };
  }

  const id = memberId.trim();
  if (!id) {
    return { ok: false, message: "Membro inválido." };
  }

  if (!(await isMemberStillEligibleForBulk(admin, id))) {
    return { ok: false, message: "Membro não é mais elegível para este lote." };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", id)
    .maybeSingle();

  const result = await resendMemberAccessWithNewPassword(id);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  await addBulkSentToday(admin, dayLabel, 1);
  const sentTodayAfter = await getBulkSentToday(admin, dayLabel);
  const resendAfter = await getResendDailyUsage(admin);
  const bulkRemAfter = Math.max(0, BULK_MEMBER_ACCESS_EMAIL_DAILY_LIMIT - sentTodayAfter);
  const remainingToday = Math.min(bulkRemAfter, resendAfter.remainingForBulk);

  return {
    ok: true,
    fullName: profile?.full_name?.trim() || "Aluno",
    email: profile?.email?.trim() || "",
    sentToday: sentTodayAfter,
    remainingToday,
  };
}

export type BulkMemberAccessEmailStatus = {
  dailyLimit: number;
  sentToday: number;
  remainingToday: number;
  eligibleCount: number;
  dayLabel: string;
  resendDailyLimit: number;
  resendAccessSentToday: number;
  resendRemainingToday: number;
};

export async function getBulkMemberAccessEmailStatus(): Promise<BulkMemberAccessEmailStatus> {
  const admin = createAdminClient();
  const dayLabel = todayInSaoPaulo();
  const sentToday = await getBulkSentToday(admin, dayLabel);
  const eligible = await listEligibleBulkMemberAccessIds();
  const resendUsage = await getResendDailyUsage(admin);
  const bulkRemaining = Math.max(0, BULK_MEMBER_ACCESS_EMAIL_DAILY_LIMIT - sentToday);
  const remainingToday = Math.min(bulkRemaining, resendUsage.remainingForBulk);

  return {
    dailyLimit: BULK_MEMBER_ACCESS_EMAIL_DAILY_LIMIT,
    sentToday,
    remainingToday,
    eligibleCount: eligible.length,
    dayLabel,
    resendDailyLimit: resendUsage.limit,
    resendAccessSentToday: resendUsage.accessEmailsSent,
    resendRemainingToday: resendUsage.remainingForBulk,
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

/** Envio em uma única requisição (legado); a UI usa envio passo a passo para evitar timeout. */
export async function runBulkMemberAccessEmailSend(): Promise<BulkMemberAccessEmailRunResult> {
  const plan = await planBulkMemberAccessBatch();
  if (!plan.ok) {
    return { ok: false, message: plan.message };
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const target of plan.targets) {
    const result = await sendOneBulkMemberAccessEmail(target.id);
    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
      if (errors.length < 10) {
        errors.push(`${target.fullName}: ${result.message}`);
      }
    }
    await sleep(200);
  }

  const admin = createAdminClient();
  const dayLabel = todayInSaoPaulo();
  const sentTodayAfter = await getBulkSentToday(admin, dayLabel);
  const eligibleAfter = await listEligibleBulkMemberAccessIds();

  return {
    ok: true,
    sent,
    failed,
    skippedLimit: plan.skippedByLimit,
    sentToday: sentTodayAfter,
    remainingToday: Math.max(0, BULK_MEMBER_ACCESS_EMAIL_DAILY_LIMIT - sentTodayAfter),
    eligibleRemaining: eligibleAfter.length,
    errors,
  };
}
