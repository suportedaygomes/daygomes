import type { ProfileRow } from "@/lib/auth/profile";
import { getAvatarPublicUrl } from "@/lib/auth/profile";
import {
  correctionsRemaining,
  normalizeCorrectionQuota,
} from "@/lib/editais/enrollment-quota";
import { isStaffRole } from "@/lib/members/staff-member-profile";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";

export type StaffMemberDirectoryRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  cpf: string | null;
  whatsapp: string | null;
  avatarUrl: string | null;
  /** Data de criação da conta na plataforma (ISO). */
  joinedAt: string | null;
  editalCount: number;
  /** Correções já consumidas do plano (soma das mentorias). */
  correctionsUsed: number;
  /** Correções ainda disponíveis para envio (soma das mentorias). */
  correctionsRemaining: number;
  /** Cota total contratada (soma das mentorias, 0–4 cada). */
  correctionsQuota: number;
};

export async function listStaffMemberDirectory(
  staff: ProfileRow,
): Promise<StaffMemberDirectoryRow[]> {
  if (!isStaffRole(staff.role)) return [];

  const admin = createAdminClient();
  const { url: supabaseUrl } = getSupabasePublicEnv();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, email, cpf, whatsapp, avatar_path, banned, created_at")
    .eq("role", "membro")
    .eq("banned", false)
    .order("full_name", { ascending: true });
  if (!profiles?.length) return [];

  let memberIds = profiles.map((row) => row.id);

  if (staff.role === "corretor") {
    const { data: enrollments } = await admin
      .from("member_edital_enrollments")
      .select("member_id");
    const { data: submissions } = await admin
      .from("phase_submissions")
      .select("member_id");

    const allowed = new Set<string>();
    for (const row of enrollments ?? []) allowed.add(row.member_id);
    for (const row of submissions ?? []) {
      if (row.member_id) allowed.add(row.member_id);
    }
    memberIds = memberIds.filter((id) => allowed.has(id));
  }

  const filteredProfiles = profiles.filter((row) => memberIds.includes(row.id));
  if (!filteredProfiles.length) return [];

  const { data: enrollments } = await admin
    .from("member_edital_enrollments")
    .select("id, member_id, edital_id, correction_quota")
    .in("member_id", memberIds);

  const enrollmentsByMember = new Map<
    string,
    { editalIds: Set<string>; rows: { id: string; correction_quota: number }[] }
  >();
  for (const row of enrollments ?? []) {
    let bucket = enrollmentsByMember.get(row.member_id);
    if (!bucket) {
      bucket = { editalIds: new Set(), rows: [] };
      enrollmentsByMember.set(row.member_id, bucket);
    }
    bucket.editalIds.add(row.edital_id);
    bucket.rows.push({
      id: row.id,
      correction_quota: normalizeCorrectionQuota(row.correction_quota),
    });
  }

  const enrollmentIds = (enrollments ?? []).map((row) => row.id);

  const submissionCountByEnrollment = new Map<string, number>();
  if (enrollmentIds.length) {
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
  }

  return filteredProfiles.map((profile) => {
    const bucket = enrollmentsByMember.get(profile.id);
    const editalIds = bucket?.editalIds ?? new Set<string>();

    let correctionsQuota = 0;
    let correctionsUsed = 0;
    let correctionsRemainingTotal = 0;

    for (const enrollment of bucket?.rows ?? []) {
      const quota = enrollment.correction_quota;
      const used = submissionCountByEnrollment.get(enrollment.id) ?? 0;
      correctionsQuota += quota;
      correctionsUsed += used;
      correctionsRemainingTotal += correctionsRemaining(quota, used);
    }

    return {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      cpf: profile.cpf,
      whatsapp: profile.whatsapp,
      avatarUrl: getAvatarPublicUrl(supabaseUrl, profile.avatar_path),
      joinedAt: profile.created_at ?? null,
      editalCount: editalIds.size,
      correctionsUsed,
      correctionsRemaining: correctionsRemainingTotal,
      correctionsQuota,
    };
  });
}
