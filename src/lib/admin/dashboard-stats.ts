import { listPendingSubmissionsForStaff } from "@/lib/corrector/pending-queue";
import {
  normalizeSubmissionPeriodDays,
  resolveMemberPhaseDeadlineAt,
} from "@/lib/editais/member-phase-deadline";
import { memberNeedsPhaseSubmission } from "@/lib/editais/phase-submission-pending";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminMemberMonthBucket = {
  key: string;
  label: string;
  count: number;
};

export type AdminMissedDeadlineRow = {
  memberId: string;
  memberName: string;
  editalTitle: string;
  cargoName: string;
  phaseTitle: string;
  phaseNumber: number;
  deadlineAt: string;
};

type AccessRow = {
  enrollment_id: string;
  phase_id: string;
  unlocked_at: string;
  member_edital_enrollments: {
    member_id: string;
    cargo_id: string;
    edital_cargos: {
      name: string;
      editais:
        | { title: string; submission_period_days: number | null }
        | { title: string; submission_period_days: number | null }[]
        | null;
    } | null;
  } | null;
  edital_phases: {
    title: string;
    phase_number: number;
    deadline_at: string | null;
    cargo_id: string;
  } | null;
};

export type AdminDashboardStats = {
  activeMembersCount: number;
  membersJoinedThisMonth: number;
  membersByMonth: AdminMemberMonthBucket[];
  missedDeadlineCount: number;
  missedDeadlineMemberCount: number;
  missedDeadlines: AdminMissedDeadlineRow[];
  pendingCorrections: number;
  recentPending: {
    id: string;
    memberName: string;
    phaseTitle: string;
    phaseNumber: number | null;
    submittedAt: string;
  }[];
};

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function buildLastMonthsBuckets(monthCount: number): AdminMemberMonthBucket[] {
  const buckets: AdminMemberMonthBucket[] = [];
  const now = new Date();
  for (let i = monthCount - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const label = date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
    buckets.push({ key, label, count: 0 });
  }
  return buckets;
}

function monthKeyFromIso(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export async function getAdminDashboardStats(
  adminId: string,
): Promise<AdminDashboardStats> {
  const admin = createAdminClient();
  const now = Date.now();
  const monthBuckets = buildLastMonthsBuckets(6);
  const bucketByKey = new Map(monthBuckets.map((item) => [item.key, item]));
  const currentMonthKey = monthKeyFromIso(new Date().toISOString());

  const { count: activeMembersCount } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "membro")
    .eq("banned", false);

  const rangeStart = new Date();
  rangeStart.setMonth(rangeStart.getMonth() - (monthBuckets.length - 1));
  rangeStart.setDate(1);
  rangeStart.setHours(0, 0, 0, 0);

  const { data: memberProfiles } = await admin
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("role", "membro")
    .gte("created_at", rangeStart.toISOString());

  let membersJoinedThisMonth = 0;
  for (const profile of memberProfiles ?? []) {
    const key = monthKeyFromIso(profile.created_at);
    const bucket = bucketByKey.get(key);
    if (bucket) {
      bucket.count += 1;
    }
    if (key === currentMonthKey) {
      membersJoinedThisMonth += 1;
    }
  }

  const { data: activeMembers } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("role", "membro")
    .eq("banned", false);

  const activeMemberById = new Map(
    (activeMembers ?? []).map((item) => [item.id, item.full_name ?? "Membro"]),
  );

  const { data: accessRows } = await admin.from("member_phase_access").select(
    `
      enrollment_id,
      phase_id,
      unlocked_at,
      member_edital_enrollments (
        member_id,
        cargo_id,
        edital_cargos (
          name,
          editais ( title, submission_period_days )
        )
      ),
      edital_phases (
        title,
        phase_number,
        deadline_at,
        cargo_id
      )
    `,
  );

  const rows = (accessRows ?? []) as unknown as AccessRow[];
  const enrollmentIds = [...new Set(rows.map((row) => row.enrollment_id))];

  const { data: submissions } = enrollmentIds.length
    ? await admin
        .from("phase_submissions")
        .select("id, enrollment_id, phase_id, status")
        .in("enrollment_id", enrollmentIds)
    : { data: [] };

  const submissionByKey = new Map(
    (submissions ?? []).map((item) => [`${item.enrollment_id}:${item.phase_id}`, item]),
  );

  const submissionIds = (submissions ?? []).map((item) => item.id);
  const { data: corrections } = submissionIds.length
    ? await admin
        .from("phase_corrections")
        .select("submission_id, allow_resubmit")
        .in("submission_id", submissionIds)
    : { data: [] };

  const allowResubmitBySubmission = new Map(
    (corrections ?? []).map((item) => [item.submission_id, item.allow_resubmit === true]),
  );

  const missedDeadlines: AdminMissedDeadlineRow[] = [];
  const phasesCountByCargo = new Map<string, number>();

  for (const row of rows) {
    const enrollment = unwrap(row.member_edital_enrollments);
    const phase = unwrap(row.edital_phases);
    if (!enrollment || !phase) continue;
    if (phase.cargo_id !== enrollment.cargo_id) continue;
    if (!activeMemberById.has(enrollment.member_id)) continue;

    let phasesInCargo = phasesCountByCargo.get(enrollment.cargo_id);
    if (phasesInCargo === undefined) {
      const { count } = await admin
        .from("edital_phases")
        .select("*", { count: "exact", head: true })
        .eq("cargo_id", enrollment.cargo_id);
      phasesInCargo = count ?? 0;
      phasesCountByCargo.set(enrollment.cargo_id, phasesInCargo);
    }

    const cargo = enrollment.edital_cargos;
    const edital = unwrap(cargo?.editais);
    const phaseDeadlineAt = resolveMemberPhaseDeadlineAt({
      unlockedAt: row.unlocked_at,
      submissionPeriodDays: normalizeSubmissionPeriodDays(edital?.submission_period_days),
      phasesInCargo,
      legacyDeadlineAt: phase.deadline_at,
    });

    const deadlineMs = new Date(phaseDeadlineAt).getTime();
    if (deadlineMs > now) continue;

    const submission = submissionByKey.get(`${row.enrollment_id}:${row.phase_id}`);
    const allowResubmit = submission
      ? allowResubmitBySubmission.get(submission.id) ?? false
      : false;

    if (!memberNeedsPhaseSubmission(submission, allowResubmit)) continue;

    missedDeadlines.push({
      memberId: enrollment.member_id,
      memberName: activeMemberById.get(enrollment.member_id) ?? "Membro",
      editalTitle: edital?.title ?? "Edital",
      cargoName: cargo?.name ?? "—",
      phaseTitle: phase.title,
      phaseNumber: phase.phase_number,
      deadlineAt: phaseDeadlineAt,
    });
  }

  missedDeadlines.sort(
    (a, b) => new Date(b.deadlineAt).getTime() - new Date(a.deadlineAt).getTime(),
  );

  const missedDeadlineMemberCount = new Set(missedDeadlines.map((item) => item.memberId)).size;

  const pending = await listPendingSubmissionsForStaff({
    id: adminId,
    role: "admin",
  });

  const recentPending = pending.slice(0, 4).map((row) => ({
    id: row.id,
    memberName: row.memberName,
    phaseTitle: row.phaseTitle,
    phaseNumber: row.phaseNumber,
    submittedAt: row.submitted_at,
  }));

  return {
    activeMembersCount: activeMembersCount ?? 0,
    membersJoinedThisMonth,
    membersByMonth: monthBuckets,
    missedDeadlineCount: missedDeadlines.length,
    missedDeadlineMemberCount,
    missedDeadlines: missedDeadlines.slice(0, 20),
    pendingCorrections: pending.length,
    recentPending,
  };
}
