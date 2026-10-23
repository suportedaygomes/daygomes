import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Acesso à plataforma = ao menos uma inscrição com cota de correção > 0. */
export async function memberHasCorrectionPlatformAccess(
  admin: AdminClient,
  memberId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("member_edital_enrollments")
    .select("id")
    .eq("member_id", memberId)
    .gt("correction_quota", 0)
    .limit(1);

  return Boolean(data?.length);
}

export type RemoveMemberAccountResult =
  | { removed: true }
  | { removed: false; reason: "not_member" | "has_correction_access" | "has_submissions" | "delete_failed" };

/**
 * Remove login do membro quando não há mais motivo para usar a plataforma
 * (sem cota de correção em nenhuma mentoria e sem envios no histórico).
 */
export async function removeMemberAccountIfNoCorrectionAccess(
  admin: AdminClient,
  memberId: string,
): Promise<RemoveMemberAccountResult> {
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", memberId)
    .maybeSingle();

  if (!profile || profile.role !== "membro") {
    return { removed: false, reason: "not_member" };
  }

  if (await memberHasCorrectionPlatformAccess(admin, memberId)) {
    return { removed: false, reason: "has_correction_access" };
  }

  const { count: submissionCount } = await admin
    .from("phase_submissions")
    .select("*", { count: "exact", head: true })
    .eq("member_id", memberId);

  if ((submissionCount ?? 0) > 0) {
    return { removed: false, reason: "has_submissions" };
  }

  const { error: enrollmentsError } = await admin
    .from("member_edital_enrollments")
    .delete()
    .eq("member_id", memberId);

  if (enrollmentsError) {
    console.error("[member-platform-access] delete enrollments", enrollmentsError.message);
    return { removed: false, reason: "delete_failed" };
  }

  const { error: authError } = await admin.auth.admin.deleteUser(memberId);
  if (authError) {
    console.error("[member-platform-access] deleteUser", authError.message);
    return { removed: false, reason: "delete_failed" };
  }

  return { removed: true };
}
