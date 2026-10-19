import {
  correctionsRemaining,
  normalizeEnrollmentCorrectionQuota,
} from "@/lib/editais/enrollment-quota";
import { createAdminClient } from "@/lib/supabase/admin";

export type StaffMemberEnrollmentSummary = {
  enrollmentId: string;
  editalId: string;
  editalTitle: string;
  correctionQuota: number;
  correctionsUsed: number;
  correctionsRemaining: number;
  enrolledAt: string;
  planLabel: string;
};

function describePlan(quota: number): string {
  if (quota === 0) {
    return "Mentoria só conteúdo (0 correções no plano — pacote avulso pode aumentar a cota)";
  }
  if (quota === 4) {
    return "Plano com 4 correções incluídas";
  }
  if (quota > 4) {
    return `Cota ampliada pelo admin (${quota} correções no total do plano)`;
  }
  return `Plano com ${quota} correção${quota === 1 ? "" : "ões"} incluídas`;
}

export async function listStaffMemberEnrollments(
  memberId: string,
): Promise<StaffMemberEnrollmentSummary[]> {
  const admin = createAdminClient();

  const { data: enrollments } = await admin
    .from("member_edital_enrollments")
    .select("id, edital_id, correction_quota, created_at, editais(title)")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  if (!enrollments?.length) return [];

  const enrollmentIds = enrollments.map((row) => row.id);

  const submissionCountByEnrollment = new Map<string, number>();
  const { data: submissions } = await admin
    .from("phase_submissions")
    .select("enrollment_id")
    .in("enrollment_id", enrollmentIds);

  for (const row of submissions ?? []) {
    submissionCountByEnrollment.set(
      row.enrollment_id,
      (submissionCountByEnrollment.get(row.enrollment_id) ?? 0) + 1,
    );
  }

  const { data: charges } = await admin
    .from("enrollment_correction_quota_charges")
    .select("enrollment_id")
    .in("enrollment_id", enrollmentIds);

  for (const row of charges ?? []) {
    submissionCountByEnrollment.set(
      row.enrollment_id,
      (submissionCountByEnrollment.get(row.enrollment_id) ?? 0) + 1,
    );
  }

  return enrollments.map((row) => {
    const edital = Array.isArray(row.editais) ? row.editais[0] : row.editais;
    const quota = normalizeEnrollmentCorrectionQuota(row.correction_quota);
    const used = submissionCountByEnrollment.get(row.id) ?? 0;
    const remaining = correctionsRemaining(quota, used);

    return {
      enrollmentId: row.id,
      editalId: row.edital_id,
      editalTitle: edital?.title ?? "Edital",
      correctionQuota: quota,
      correctionsUsed: used,
      correctionsRemaining: remaining,
      enrolledAt: row.created_at,
      planLabel: describePlan(quota),
    };
  });
}
