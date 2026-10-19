import type { ProfileRow } from "@/lib/auth/profile";
import { getAvatarPublicUrl } from "@/lib/auth/profile";
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
  editalCount: number;
  activitiesSent: number;
  themesTotal: number;
  themesRemaining: number;
};

async function buildPhasesPerEdital(admin: ReturnType<typeof createAdminClient>) {
  const { data: cargos } = await admin.from("edital_cargos").select("id, edital_id");
  const cargoToEdital = new Map((cargos ?? []).map((row) => [row.id, row.edital_id]));

  const { data: phases } = await admin.from("edital_phases").select("id, cargo_id");
  const countByEdital = new Map<string, number>();

  for (const phase of phases ?? []) {
    const editalId = cargoToEdital.get(phase.cargo_id);
    if (!editalId) continue;
    countByEdital.set(editalId, (countByEdital.get(editalId) ?? 0) + 1);
  }

  return countByEdital;
}

export async function listStaffMemberDirectory(
  staff: ProfileRow,
): Promise<StaffMemberDirectoryRow[]> {
  if (!isStaffRole(staff.role)) return [];

  const admin = createAdminClient();
  const { url: supabaseUrl } = getSupabasePublicEnv();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, email, cpf, whatsapp, avatar_path, banned")
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

  const phasesPerEdital = await buildPhasesPerEdital(admin);

  const { data: enrollments } = await admin
    .from("member_edital_enrollments")
    .select("id, member_id, edital_id")
    .in("member_id", memberIds);

  const enrollmentsByMember = new Map<string, { editalIds: Set<string>; enrollmentIds: string[] }>();
  for (const row of enrollments ?? []) {
    let bucket = enrollmentsByMember.get(row.member_id);
    if (!bucket) {
      bucket = { editalIds: new Set(), enrollmentIds: [] };
      enrollmentsByMember.set(row.member_id, bucket);
    }
    bucket.editalIds.add(row.edital_id);
    bucket.enrollmentIds.push(row.id);
  }

  const enrollmentIds = (enrollments ?? []).map((row) => row.id);
  const { data: submissions } = enrollmentIds.length
    ? await admin
        .from("phase_submissions")
        .select("id, enrollment_id, phase_id")
        .in("enrollment_id", enrollmentIds)
    : { data: [] };

  const submissionsByEnrollment = new Map<string, { count: number; phaseIds: Set<string> }>();
  for (const row of submissions ?? []) {
    let bucket = submissionsByEnrollment.get(row.enrollment_id);
    if (!bucket) {
      bucket = { count: 0, phaseIds: new Set() };
      submissionsByEnrollment.set(row.enrollment_id, bucket);
    }
    bucket.count += 1;
    bucket.phaseIds.add(row.phase_id);
  }

  return filteredProfiles.map((profile) => {
    const bucket = enrollmentsByMember.get(profile.id);
    const editalIds = bucket?.editalIds ?? new Set<string>();
    let themesTotal = 0;
    for (const editalId of editalIds) {
      themesTotal += phasesPerEdital.get(editalId) ?? 0;
    }

    let activitiesSent = 0;
    const submittedPhaseIds = new Set<string>();
    for (const enrollmentId of bucket?.enrollmentIds ?? []) {
      const sub = submissionsByEnrollment.get(enrollmentId);
      if (!sub) continue;
      activitiesSent += sub.count;
      for (const phaseId of sub.phaseIds) submittedPhaseIds.add(phaseId);
    }

    const themesWithSubmission = submittedPhaseIds.size;
    const themesRemaining = Math.max(0, themesTotal - themesWithSubmission);

    return {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      cpf: profile.cpf,
      whatsapp: profile.whatsapp,
      avatarUrl: getAvatarPublicUrl(supabaseUrl, profile.avatar_path),
      editalCount: editalIds.size,
      activitiesSent,
      themesTotal,
      themesRemaining,
    };
  });
}
