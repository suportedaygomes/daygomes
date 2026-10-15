import type { ProfileRow } from "@/lib/auth/profile";
import { claimSubmissionForCorrector } from "@/lib/corrector/submission-assignment";
import { createAdminClient } from "@/lib/supabase/admin";

export type CorrectionSubmissionAccess =
  | {
      ok: true;
      submission: {
        id: string;
        member_id: string;
        status: string;
        assigned_corrector_id: string | null;
      };
    }
  | { ok: false; code: "not_found" | "locked" };

export async function loadCorrectionSubmissionForStaff(
  submissionId: string,
  profile: ProfileRow,
): Promise<CorrectionSubmissionAccess> {
  const admin = createAdminClient();
  const { data: submission } = await admin
    .from("phase_submissions")
    .select("id, member_id, status, assigned_corrector_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission) {
    return { ok: false, code: "not_found" };
  }

  const pending =
    submission.status === "enviado" || submission.status === "em_correcao";

  if (pending) {
    const claim = await claimSubmissionForCorrector(
      submissionId,
      profile.id,
      profile.role,
    );
    if (!claim.ok) {
      return { ok: false, code: claim.code === "locked" ? "locked" : "not_found" };
    }
    return {
      ok: true,
      submission: claim.submission,
    };
  }

  if (profile.role !== "admin") {
    const { data: prior } = await admin
      .from("phase_corrections")
      .select("corrector_id")
      .eq("submission_id", submissionId)
      .maybeSingle();
    const ownerId = submission.assigned_corrector_id ?? prior?.corrector_id;
    if (ownerId && ownerId !== profile.id) {
      return { ok: false, code: "locked" };
    }
  }

  return {
    ok: true,
    submission,
  };
}
