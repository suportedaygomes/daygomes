/** Evita ambiguidade entre member_id e assigned_corrector_id (ambos → profiles). */
export const submissionMemberProfileEmbed =
  "profiles!phase_submissions_member_id_fkey(full_name)";

export const submissionAssignedCorrectorEmbed =
  "assigned_corrector:profiles!phase_submissions_assigned_corrector_id_fkey(full_name)";
