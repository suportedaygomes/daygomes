"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { resendMemberAccessWithNewPassword } from "@/lib/admin/resend-member-access";

export async function resendMemberAccessEmail(memberId: string) {
  const { profile } = await getCurrentProfile();
  if (!profile || profile.role !== "admin" || profile.banned) {
    return { ok: false, message: "Acesso negado." };
  }

  const id = memberId.trim();
  if (!id) {
    return { ok: false, message: "Membro inválido." };
  }

  const result = await resendMemberAccessWithNewPassword(id);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidatePath(`/painel/membros/${id}`);
  revalidatePath("/painel/membros");
  return { ok: true, message: result.message };
}
