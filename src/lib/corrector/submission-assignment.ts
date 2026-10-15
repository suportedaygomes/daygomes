import type { UserRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export type SubmissionAssignmentRow = {
  id: string;
  status: string;
  assigned_corrector_id: string | null;
  member_id: string;
};

export type ClaimSubmissionResult =
  | { ok: true; submission: SubmissionAssignmentRow }
  | { ok: false; code: "not_found" | "locked" | "not_pending" };

function isPendingCorrectionStatus(status: string) {
  return status === "enviado" || status === "em_correcao";
}

export function correctorMayAccessPendingSubmission(
  submission: SubmissionAssignmentRow,
  correctorId: string,
  role: UserRole,
): boolean {
  if (role === "admin") return true;
  if (role !== "corretor") return false;
  if (!isPendingCorrectionStatus(submission.status)) return true;
  return submission.assigned_corrector_id === correctorId;
}

/** Fila visível: livres na fila ou já atribuídas ao corretor. */
export function correctorQueueOrFilter(correctorId: string) {
  return `and(status.eq.enviado,assigned_corrector_id.is.null),assigned_corrector_id.eq.${correctorId}`;
}

export async function claimSubmissionForCorrector(
  submissionId: string,
  correctorId: string,
  role: UserRole,
): Promise<ClaimSubmissionResult> {
  const admin = createAdminClient();
  const { data: submission } = await admin
    .from("phase_submissions")
    .select("id, status, assigned_corrector_id, member_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission) {
    return { ok: false, code: "not_found" };
  }

  if (!isPendingCorrectionStatus(submission.status)) {
    return { ok: true, submission };
  }

  if (role === "admin") {
    if (!submission.assigned_corrector_id) {
      await admin
        .from("phase_submissions")
        .update({
          assigned_corrector_id: correctorId,
          status: "em_correcao",
        })
        .eq("id", submissionId)
        .is("assigned_corrector_id", null)
        .in("status", ["enviado", "em_correcao"]);
    }
    return { ok: true, submission };
  }

  if (
    submission.assigned_corrector_id &&
    submission.assigned_corrector_id !== correctorId
  ) {
    return { ok: false, code: "locked" };
  }

  if (!submission.assigned_corrector_id) {
    const { data: claimed } = await admin
      .from("phase_submissions")
      .update({
        assigned_corrector_id: correctorId,
        status: "em_correcao",
      })
      .eq("id", submissionId)
      .is("assigned_corrector_id", null)
      .in("status", ["enviado", "em_correcao"])
      .select("id, status, assigned_corrector_id, member_id")
      .maybeSingle();

    if (!claimed) {
      const { data: again } = await admin
        .from("phase_submissions")
        .select("id, status, assigned_corrector_id, member_id")
        .eq("id", submissionId)
        .maybeSingle();

      if (!again || !isPendingCorrectionStatus(again.status)) {
        return { ok: false, code: "not_pending" };
      }
      if (again.assigned_corrector_id === correctorId) {
        return { ok: true, submission: again };
      }
      return { ok: false, code: "locked" };
    }

    return { ok: true, submission: claimed };
  }

  return { ok: true, submission };
}
