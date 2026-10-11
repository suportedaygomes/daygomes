import { sendPhaseDeadlineReminderEmail } from "@/lib/email/send-phase-deadline-reminder-email";
import {
  daysUntilDeadline,
  memberNeedsPhaseSubmission,
  reminderKindForDaysLeft,
} from "@/lib/editais/phase-submission-pending";
import { createAdminClient } from "@/lib/supabase/admin";

type AccessRow = {
  enrollment_id: string;
  phase_id: string;
  member_edital_enrollments: {
    member_id: string;
    cargo_id: string;
    edital_cargos: {
      name: string;
      editais: { title: string } | { title: string }[] | null;
    } | null;
  } | null;
  edital_phases: {
    title: string;
    phase_number: number;
    deadline_at: string;
    cargo_id: string;
  } | null;
};

export type RunPhaseDeadlineRemindersResult = {
  checked: number;
  sent: number;
  skipped: number;
  errors: string[];
};

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function runPhaseDeadlineReminders(): Promise<RunPhaseDeadlineRemindersResult> {
  const admin = createAdminClient();
  const now = Date.now();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const editaisUrl = `${siteUrl}/painel/editais`;

  const { data: accessRows, error: accessError } = await admin
    .from("member_phase_access")
    .select(
      `
      enrollment_id,
      phase_id,
      member_edital_enrollments (
        member_id,
        cargo_id,
        edital_cargos (
          name,
          editais ( title )
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

  if (accessError) {
    return { checked: 0, sent: 0, skipped: 0, errors: [accessError.message] };
  }

  const rows = (accessRows ?? []) as unknown as AccessRow[];
  const errors: string[] = [];
  let sent = 0;
  let skipped = 0;

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

  const { data: sentReminders } = await admin
    .from("phase_submission_reminders")
    .select("enrollment_id, phase_id, reminder_kind");

  const sentSet = new Set(
    (sentReminders ?? []).map(
      (item) => `${item.enrollment_id}:${item.phase_id}:${item.reminder_kind}`,
    ),
  );

  const memberIds = [
    ...new Set(
      rows
        .map((row) => unwrap(row.member_edital_enrollments)?.member_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const { data: profiles } = memberIds.length
    ? await admin.from("profiles").select("id, email, full_name").in("id", memberIds)
    : { data: [] };

  const profileById = new Map((profiles ?? []).map((item) => [item.id, item]));

  for (const row of rows) {
    const enrollment = unwrap(row.member_edital_enrollments);
    const phase = unwrap(row.edital_phases);
    if (!enrollment || !phase) {
      skipped += 1;
      continue;
    }

    if (phase.cargo_id !== enrollment.cargo_id) {
      skipped += 1;
      continue;
    }

    const deadlineMs = new Date(phase.deadline_at).getTime();
    if (deadlineMs <= now) {
      skipped += 1;
      continue;
    }

    const daysLeft = daysUntilDeadline(phase.deadline_at, now);
    const kind = reminderKindForDaysLeft(daysLeft);
    if (!kind) {
      skipped += 1;
      continue;
    }

    const submission = submissionByKey.get(`${row.enrollment_id}:${row.phase_id}`);
    const allowResubmit = submission
      ? allowResubmitBySubmission.get(submission.id) ?? false
      : false;

    if (!memberNeedsPhaseSubmission(submission, allowResubmit)) {
      skipped += 1;
      continue;
    }

    const sentKey = `${row.enrollment_id}:${row.phase_id}:${kind}`;
    if (sentSet.has(sentKey)) {
      skipped += 1;
      continue;
    }

    const profile = profileById.get(enrollment.member_id);
    const email = profile?.email?.trim().toLowerCase();
    if (!email) {
      errors.push(`Sem e-mail: membro ${enrollment.member_id}`);
      skipped += 1;
      continue;
    }

    const cargo = enrollment.edital_cargos;
    const edital = unwrap(cargo?.editais);

    const emailResult = await sendPhaseDeadlineReminderEmail({
      to: email,
      fullName: profile?.full_name ?? "",
      editalTitle: edital?.title ?? "Edital",
      cargoName: cargo?.name ?? "—",
      phaseTitle: phase.title,
      phaseNumber: phase.phase_number,
      deadlineAt: new Date(phase.deadline_at),
      reminderKind: kind,
      isResubmit: Boolean(submission && allowResubmit),
      editaisUrl,
    });

    if (!emailResult.ok) {
      errors.push(`${email}: ${emailResult.error}`);
      continue;
    }

    const { error: insertError } = await admin.from("phase_submission_reminders").insert({
      enrollment_id: row.enrollment_id,
      phase_id: row.phase_id,
      member_id: enrollment.member_id,
      reminder_kind: kind,
    });

    if (insertError) {
      errors.push(`Registro ${sentKey}: ${insertError.message}`);
      continue;
    }

    sentSet.add(sentKey);
    sent += 1;
  }

  return { checked: rows.length, sent, skipped, errors };
}
