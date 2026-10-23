import "server-only";

import { removeMemberAccountIfNoCorrectionAccess } from "@/lib/members/member-platform-access";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type UnenrollMemberFromEditalResult =
  | { ok: true; message: string; memberAccountRemoved: boolean }
  | { ok: false; message: string };

export async function unenrollMemberFromEditalCore(
  admin: AdminClient,
  input: { editalId: string; enrollmentId: string },
): Promise<UnenrollMemberFromEditalResult> {
  const editalId = input.editalId?.trim();
  const enrollmentId = input.enrollmentId?.trim();

  if (!editalId || !enrollmentId) {
    return { ok: false, message: "Inscrição inválida." };
  }

  const { data: enrollment, error: loadError } = await admin
    .from("member_edital_enrollments")
    .select("id, member_id, edital_id")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (loadError) {
    return { ok: false, message: "Não foi possível carregar a inscrição." };
  }

  if (!enrollment || enrollment.edital_id !== editalId) {
    return { ok: false, message: "Inscrição não encontrada nesta mentoria." };
  }

  const { count: submissionCount } = await admin
    .from("phase_submissions")
    .select("*", { count: "exact", head: true })
    .eq("enrollment_id", enrollmentId);

  if ((submissionCount ?? 0) > 0) {
    return {
      ok: false,
      message:
        "Não é possível desvincular: o aluno já enviou atividades nesta mentoria. Mantenha a inscrição para preservar o histórico.",
    };
  }

  const memberId = enrollment.member_id;

  const { error: deleteError } = await admin
    .from("member_edital_enrollments")
    .delete()
    .eq("id", enrollmentId);

  if (deleteError) {
    console.error("[unenrollMemberFromEdital] delete", deleteError.message);
    return { ok: false, message: "Não foi possível desvincular o membro." };
  }

  const removal = await removeMemberAccountIfNoCorrectionAccess(admin, memberId);
  const memberAccountRemoved = removal.removed;

  let message = "Membro desvinculado desta mentoria.";
  if (memberAccountRemoved) {
    message += " O login na plataforma foi removido (sem outras mentorias com correção).";
  }

  return { ok: true, message, memberAccountRemoved };
}
