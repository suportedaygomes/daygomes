import { computeEditalAverageByPhases } from "@/lib/editais/edital-phase-average";
import { parseSubmissionGrade } from "@/lib/editais/grades";
import {
  isDefinitiveCorrection,
  isSubmittedForCorrection,
} from "@/lib/editais/correction-finalized";
import {
  daysUntilDeadline,
  memberNeedsPhaseSubmission,
} from "@/lib/editais/phase-submission-pending";
import { createAdminClient } from "@/lib/supabase/admin";

export type MemberNotification = {
  id: string;
  kind: "correction" | "deadline" | "resubmit" | "support";
  title: string;
  body: string;
  href: string;
  sortAt: string;
};

export type MemberEnrollmentSummary = {
  enrollmentId: string;
  editalTitle: string;
  cargoName: string;
  phasesTotal: number;
  phasesOpen: number;
  submissionsCount: number;
  nextDeadlineAt: string | null;
  averageGrade: number | null;
};

export type MemberRecentCorrection = {
  submissionId: string;
  editalTitle: string;
  phaseTitle: string;
  phaseNumber: number;
  grade: number | null;
  updatedAt: string;
};

export type MemberDashboardStats = {
  enrollmentCount: number;
  phasesOpenCount: number;
  submittedForCorrection: number;
  finalizedActivitiesCount: number;
  pendingActionCount: number;
  enrollments: MemberEnrollmentSummary[];
  notifications: MemberNotification[];
  recentCorrections: MemberRecentCorrection[];
};

export async function getMemberDashboardStats(
  memberId: string,
): Promise<MemberDashboardStats> {
  const admin = createAdminClient();
  const now = Date.now();

  const { data: enrollments } = await admin
    .from("member_edital_enrollments")
    .select("id, cargo_id, editais(title), edital_cargos(name)")
    .eq("member_id", memberId);

  const enrollmentSummaries: MemberEnrollmentSummary[] = [];
  const notifications: MemberNotification[] = [];
  const recentCorrections: MemberRecentCorrection[] = [];

  let submittedForCorrection = 0;
  let finalizedActivitiesCount = 0;
  let pendingActionCount = 0;
  let phasesOpenCount = 0;

  for (const enrollment of enrollments ?? []) {
    const edital = Array.isArray(enrollment.editais)
      ? enrollment.editais[0]
      : enrollment.editais;
    const cargo = Array.isArray(enrollment.edital_cargos)
      ? enrollment.edital_cargos[0]
      : enrollment.edital_cargos;
    const editalTitle = edital?.title ?? "Edital";
    const cargoName = cargo?.name ?? "—";

    const { data: accessRows } = await admin
      .from("member_phase_access")
      .select("phase_id")
      .eq("enrollment_id", enrollment.id);

    const phaseIds = (accessRows ?? []).map((row) => row.phase_id);
    const { data: phases } = phaseIds.length
      ? await admin
          .from("edital_phases")
          .select("id, phase_number, title, deadline_at")
          .in("id", phaseIds)
      : { data: [] };

    const { data: allCargoPhases } = await admin
      .from("edital_phases")
      .select("id")
      .eq("cargo_id", enrollment.cargo_id)
      .order("phase_number");

    const { data: submissions } = await admin
      .from("phase_submissions")
      .select("id, phase_id, status, submitted_at")
      .eq("enrollment_id", enrollment.id);

    const submissionByPhase = new Map(
      (submissions ?? []).map((item) => [item.phase_id, item]),
    );
    const submissionIds = (submissions ?? []).map((item) => item.id);
    const { data: corrections } = submissionIds.length
      ? await admin
          .from("phase_corrections")
          .select("submission_id, grade, allow_resubmit, updated_at")
          .in("submission_id", submissionIds)
      : { data: [] };

    const correctionBySubmission = new Map(
      (corrections ?? []).map((item) => [item.submission_id, item]),
    );

    let enrollmentSubmissions = 0;
    let enrollmentOpen = 0;
    let nextDeadline: Date | null = null;

    for (const phase of phases ?? []) {
      const deadlineMs = new Date(phase.deadline_at).getTime();
      const isOpen = deadlineMs > now;

      const submission = submissionByPhase.get(phase.id);
      const correction = submission
        ? correctionBySubmission.get(submission.id)
        : null;
      const allowResubmit = correction?.allow_resubmit ?? false;

      if (isOpen && memberNeedsPhaseSubmission(submission ?? null, allowResubmit)) {
        enrollmentOpen += 1;
      }
      const gradeValue = parseSubmissionGrade(correction?.grade);

      if (submission) {
        if (isSubmittedForCorrection(submission)) {
          submittedForCorrection += 1;
        }

        const isFinal = isDefinitiveCorrection(submission, correction);
        if (isFinal && gradeValue != null) {
          enrollmentSubmissions += 1;
          finalizedActivitiesCount += 1;

          const updatedAt = correction?.updated_at ?? submission.submitted_at;
          recentCorrections.push({
            submissionId: submission.id,
            editalTitle,
            phaseTitle: phase.title,
            phaseNumber: phase.phase_number,
            grade: gradeValue,
            updatedAt,
          });

          const twoWeeksAgo = now - 14 * 86_400_000;
          if (new Date(updatedAt).getTime() > twoWeeksAgo) {
            notifications.push({
              id: `correction-${submission.id}`,
              kind: "correction",
              title: "Correção definitiva disponível",
              body: `${editalTitle} · ${phase.title}: nota ${gradeValue}`,
              href: `/painel/editais/correcao/${submission.id}`,
              sortAt: updatedAt,
            });
          }
        }
      }

      if (isOpen && memberNeedsPhaseSubmission(submission ?? null, allowResubmit)) {
        pendingActionCount += 1;

        const daysLeft = daysUntilDeadline(phase.deadline_at, now);
        if (daysLeft >= 0 && daysLeft <= 7) {
          notifications.push({
            id: `deadline-${phase.id}`,
            kind: allowResubmit ? "resubmit" : "deadline",
            title: allowResubmit ? "Reenvio liberado" : "Prazo se aproximando",
            body: `${phase.title}: ${daysLeft === 0 ? "encerra hoje" : `faltam ${daysLeft} dia(s)`}`,
            href: "/painel/editais",
            sortAt: phase.deadline_at,
          });
        }

        if (allowResubmit && submission) {
          notifications.push({
            id: `resubmit-${submission.id}`,
            kind: "resubmit",
            title: "Reenvie sua atividade",
            body: `${editalTitle} · ${phase.title}`,
            href: "/painel/editais",
            sortAt: correction?.updated_at ?? submission.submitted_at,
          });
        }
      }

      if (isOpen) {
        const deadline = new Date(phase.deadline_at);
        if (!nextDeadline || deadline < nextDeadline) {
          nextDeadline = deadline;
        }
      }
    }

    if (enrollmentOpen > 0) {
      phasesOpenCount += 1;
    }

    const { average: averageGrade, phasesTotal } = computeEditalAverageByPhases(
      allCargoPhases ?? [],
      submissions ?? [],
      (corrections ?? []).map((item) => ({
        submission_id: item.submission_id,
        grade: item.grade,
        allow_resubmit: item.allow_resubmit,
      })),
    );

    enrollmentSummaries.push({
      enrollmentId: enrollment.id,
      editalTitle,
      cargoName,
      phasesTotal,
      phasesOpen: enrollmentOpen,
      submissionsCount: enrollmentSubmissions,
      nextDeadlineAt: nextDeadline?.toISOString() ?? null,
      averageGrade,
    });
  }

  const { data: supportTickets } = await admin
    .from("support_tickets")
    .select("id, title, status, updated_at")
    .eq("member_id", memberId)
    .in("status", ["em_atendimento", "aberto"])
    .order("updated_at", { ascending: false })
    .limit(5);

  for (const ticket of supportTickets ?? []) {
    if (ticket.status === "em_atendimento") {
      notifications.push({
        id: `support-${ticket.id}`,
        kind: "support",
        title: "Resposta no suporte",
        body: ticket.title,
        href: `/painel/suporte/chamado/${ticket.id}`,
        sortAt: ticket.updated_at,
      });
    }
  }

  notifications.sort(
    (a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime(),
  );

  const dedupedNotifications = notifications.filter(
    (item, index, arr) => arr.findIndex((x) => x.id === item.id) === index,
  );

  recentCorrections.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return {
    enrollmentCount: enrollments?.length ?? 0,
    phasesOpenCount,
    submittedForCorrection,
    finalizedActivitiesCount,
    pendingActionCount,
    enrollments: enrollmentSummaries,
    notifications: dedupedNotifications.slice(0, 8),
    recentCorrections: recentCorrections.slice(0, 5),
  };
}
