"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import {
  type BulkMemberAccessTarget,
  getBulkMemberAccessEmailStatus,
  planBulkMemberAccessBatch,
  runBulkMemberAccessEmailSend,
  sendOneBulkMemberAccessEmail,
} from "@/lib/admin/bulk-member-access-email";
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

export async function fetchBulkMemberAccessEmailStatus() {
  const { profile } = await getCurrentProfile();
  if (!profile || profile.role !== "admin" || profile.banned) {
    return { ok: false, message: "Acesso negado." };
  }

  const status = await getBulkMemberAccessEmailStatus();
  return { ok: true, status };
}

export async function sendBulkMemberAccessEmails() {
  const { profile } = await getCurrentProfile();
  if (!profile || profile.role !== "admin" || profile.banned) {
    return { ok: false, message: "Acesso negado." };
  }

  const result = await runBulkMemberAccessEmailSend();
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidatePath("/painel/membros");
  return { ok: true, result };
}

export async function fetchBulkMemberAccessBatch(): Promise<
  | { ok: false; message: string }
  | { ok: true; targets: BulkMemberAccessTarget[]; skippedByLimit: number }
> {
  const { profile } = await getCurrentProfile();
  if (!profile || profile.role !== "admin" || profile.banned) {
    return { ok: false, message: "Acesso negado." };
  }

  const plan = await planBulkMemberAccessBatch();
  if (!plan.ok) {
    return { ok: false, message: plan.message };
  }

  return {
    ok: true,
    targets: plan.targets,
    skippedByLimit: plan.skippedByLimit,
  };
}

export async function sendBulkMemberAccessEmailStep(
  memberId: string,
): Promise<
  | { ok: false; message: string }
  | { ok: true; fullName: string; email: string; sentToday: number; remainingToday: number }
> {
  const { profile } = await getCurrentProfile();
  if (!profile || profile.role !== "admin" || profile.banned) {
    return { ok: false, message: "Acesso negado." };
  }

  const result = await sendOneBulkMemberAccessEmail(memberId);
  if (result.ok) {
    revalidatePath("/painel/membros");
  }
  return result;
}
