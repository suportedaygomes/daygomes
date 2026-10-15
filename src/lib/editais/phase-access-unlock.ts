import type { SupabaseClient } from "@supabase/supabase-js";

type SubmissionRef = {
  enrollment_id: string;
  phase_id: string;
};

export async function unlockFirstPhaseForEnrollment(
  client: SupabaseClient,
  enrollmentId: string,
  cargoId: string,
  unlockedBy?: string | null,
) {
  const { data: phase1 } = await client
    .from("edital_phases")
    .select("id")
    .eq("cargo_id", cargoId)
    .eq("phase_number", 1)
    .maybeSingle();

  if (!phase1) return;

  await client.from("member_phase_access").upsert(
    {
      enrollment_id: enrollmentId,
      phase_id: phase1.id,
      unlocked_at: new Date().toISOString(),
      unlocked_by: unlockedBy ?? null,
    },
    { onConflict: "enrollment_id,phase_id" },
  );
}

export async function findImmediateNextPhaseId(
  client: SupabaseClient,
  phaseId: string,
): Promise<string | null> {
  const { data: currentPhase } = await client
    .from("edital_phases")
    .select("cargo_id, phase_number")
    .eq("id", phaseId)
    .maybeSingle();

  if (!currentPhase) return null;

  const { data: nextPhase } = await client
    .from("edital_phases")
    .select("id")
    .eq("cargo_id", currentPhase.cargo_id)
    .eq("phase_number", currentPhase.phase_number + 1)
    .maybeSingle();

  return nextPhase?.id ?? null;
}

export async function unlockNextPhaseForSubmission(
  client: SupabaseClient,
  submission: SubmissionRef,
  unlockedBy: string,
) {
  const nextPhaseId = await findImmediateNextPhaseId(client, submission.phase_id);
  if (!nextPhaseId) return;

  await client.from("member_phase_access").upsert(
    {
      enrollment_id: submission.enrollment_id,
      phase_id: nextPhaseId,
      unlocked_by: unlockedBy,
      unlocked_at: new Date().toISOString(),
    },
    { onConflict: "enrollment_id,phase_id" },
  );
}

/** Remove acesso à fase seguinte se o aluno ainda não enviou nada nela. */
export async function revokeImmediateNextPhaseAccess(
  client: SupabaseClient,
  submission: SubmissionRef,
) {
  const nextPhaseId = await findImmediateNextPhaseId(client, submission.phase_id);
  if (!nextPhaseId) return;

  const { data: nextSubmission } = await client
    .from("phase_submissions")
    .select("id")
    .eq("enrollment_id", submission.enrollment_id)
    .eq("phase_id", nextPhaseId)
    .maybeSingle();

  if (nextSubmission) return;

  await client
    .from("member_phase_access")
    .delete()
    .eq("enrollment_id", submission.enrollment_id)
    .eq("phase_id", nextPhaseId);
}
