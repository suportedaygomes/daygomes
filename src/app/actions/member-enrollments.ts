"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { setEnrollmentCorrectionsRemaining } from "@/lib/members/update-enrollment-correction-quota";

export async function updateMemberEnrollmentCorrectionsRemaining(
  enrollmentId: string,
  correctionsRemaining: number,
  memberId: string,
) {
  const { profile } = await getCurrentProfile();
  if (!profile || profile.role !== "admin" || profile.banned) {
    return { ok: false, message: "Acesso negado." };
  }

  const result = await setEnrollmentCorrectionsRemaining(enrollmentId, correctionsRemaining);
  if (!result.ok) {
    return result;
  }

  revalidatePath("/painel/membros");
  revalidatePath(`/painel/membros/${memberId.trim()}`);
  revalidatePath("/painel/editais");

  return {
    ok: true as const,
    correctionQuota: result.correctionQuota,
    correctionsUsed: result.correctionsUsed,
    correctionsRemaining: result.correctionsRemaining,
  };
}
