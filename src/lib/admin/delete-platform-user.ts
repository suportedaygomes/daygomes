import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type DeletePlatformUserResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
    };

export async function deletePlatformUserPermanently(
  admin: AdminClient,
  targetUserId: string,
  actorUserId: string,
): Promise<DeletePlatformUserResult> {
  if (targetUserId === actorUserId) {
    return { ok: false, message: "Você não pode excluir seu próprio usuário." };
  }

  const { data: target } = await admin
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", targetUserId)
    .maybeSingle();

  if (!target) {
    return { ok: false, message: "Usuário não encontrado." };
  }

  if (target.role === "admin") {
    const { count } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("banned", false);

    if ((count ?? 0) <= 1) {
      return {
        ok: false,
        message: "Não é possível excluir o único administrador da plataforma.",
      };
    }
  }

  if (target.role === "corretor" || target.role === "admin") {
    const { count: correctionCount } = await admin
      .from("phase_corrections")
      .select("*", { count: "exact", head: true })
      .eq("corrector_id", targetUserId);

    if ((correctionCount ?? 0) > 0) {
      return {
        ok: false,
        message:
          "Este usuário já publicou correções no histórico. Por segurança do histórico dos alunos, não é possível excluir a conta. Você pode alterar o papel ou banir o acesso.",
      };
    }
  }

  const { error: submissionsError } = await admin
    .from("phase_submissions")
    .delete()
    .eq("member_id", targetUserId);

  if (submissionsError) {
    console.error("[deletePlatformUser] phase_submissions", submissionsError.message);
    return { ok: false, message: "Não foi possível remover os envios do usuário." };
  }

  const { error: enrollmentsError } = await admin
    .from("member_edital_enrollments")
    .delete()
    .eq("member_id", targetUserId);

  if (enrollmentsError) {
    console.error("[deletePlatformUser] enrollments", enrollmentsError.message);
    return { ok: false, message: "Não foi possível remover as inscrições do usuário." };
  }

  await admin
    .from("phase_submissions")
    .update({ assigned_corrector_id: null })
    .eq("assigned_corrector_id", targetUserId);

  await admin.from("submission_markups").update({ corrector_id: null }).eq("corrector_id", targetUserId);

  const { error: authError } = await admin.auth.admin.deleteUser(targetUserId);
  if (authError) {
    console.error("[deletePlatformUser] auth", authError.message);
    return {
      ok: false,
      message:
        "Não foi possível remover o login. O usuário pode ainda ter vínculos no banco — tente novamente ou contate o suporte técnico.",
    };
  }

  return { ok: true };
}