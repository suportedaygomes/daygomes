import {
  countEnrollmentCorrectionQuotaUsed,
  correctionsRemaining,
  MAX_ADMIN_ENROLLMENT_CORRECTION_QUOTA,
  normalizeEnrollmentCorrectionQuota,
} from "@/lib/editais/enrollment-quota";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setEnrollmentCorrectionsRemaining(
  enrollmentId: string,
  targetRemaining: number,
) {
  const id = enrollmentId.trim();
  if (!id) {
    return { ok: false as const, message: "Inscrição inválida." };
  }

  const remaining = Math.max(0, Math.round(Number(targetRemaining)));
  if (!Number.isFinite(remaining) || remaining > MAX_ADMIN_ENROLLMENT_CORRECTION_QUOTA) {
    return {
      ok: false as const,
      message: `Informe entre 0 e ${MAX_ADMIN_ENROLLMENT_CORRECTION_QUOTA} correções disponíveis.`,
    };
  }

  const admin = createAdminClient();

  const { data: enrollment } = await admin
    .from("member_edital_enrollments")
    .select("id, member_id, correction_quota")
    .eq("id", id)
    .maybeSingle();

  if (!enrollment) {
    return { ok: false as const, message: "Inscrição não encontrada." };
  }

  const used = await countEnrollmentCorrectionQuotaUsed(id);
  const newQuota = used + remaining;

  if (newQuota > MAX_ADMIN_ENROLLMENT_CORRECTION_QUOTA) {
    return {
      ok: false as const,
      message: `Este aluno já usou ${used} correção(ões). O máximo disponível agora é ${MAX_ADMIN_ENROLLMENT_CORRECTION_QUOTA - used}.`,
    };
  }

  const { error } = await admin
    .from("member_edital_enrollments")
    .update({ correction_quota: newQuota })
    .eq("id", id);

  if (error) {
    console.error("[enrollment-quota] admin update failed", error.message);
    return { ok: false as const, message: "Não foi possível salvar a cota." };
  }

  const quota = normalizeEnrollmentCorrectionQuota(newQuota);
  return {
    ok: true as const,
    correctionQuota: quota,
    correctionsUsed: used,
    correctionsRemaining: correctionsRemaining(quota, used),
  };
}
