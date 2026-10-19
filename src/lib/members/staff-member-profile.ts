import type { ProfileRow } from "@/lib/auth/profile";
import type { UserRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type StaffMemberContact = {
  id: string;
  full_name: string | null;
  email: string | null;
  whatsapp: string | null;
  cpf: string | null;
  birth_date: string | null;
};

export function isStaffRole(role: UserRole) {
  return role === "corretor" || role === "admin";
}

async function corretorCanViewMember(memberId: string) {
  const supabase = await createClient();
  const { data: submission } = await supabase
    .from("phase_submissions")
    .select("id")
    .eq("member_id", memberId)
    .limit(1)
    .maybeSingle();
  if (submission) return true;

  const { data: enrollment } = await supabase
    .from("member_edital_enrollments")
    .select("id")
    .eq("member_id", memberId)
    .limit(1)
    .maybeSingle();
  return Boolean(enrollment);
}

export async function getStaffMemberContact(
  memberId: string,
  staff: ProfileRow,
): Promise<StaffMemberContact | null> {
  if (!isStaffRole(staff.role)) return null;

  if (staff.role === "corretor") {
    const allowed = await corretorCanViewMember(memberId);
    if (!allowed) return null;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, email, whatsapp, cpf, birth_date, role")
    .eq("id", memberId)
    .eq("role", "membro")
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    full_name: data.full_name,
    email: data.email,
    whatsapp: data.whatsapp,
    cpf: data.cpf,
    birth_date: data.birth_date,
  };
}

export async function listStaffMemberContacts(
  staff: ProfileRow,
): Promise<StaffMemberContact[]> {
  if (!isStaffRole(staff.role)) return [];

  const supabase = await createClient();
  const { data: submissions } = await supabase
    .from("phase_submissions")
    .select("member_id");

  const memberIds = [...new Set((submissions ?? []).map((row) => row.member_id))];
  if (!memberIds.length) return [];

  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, email, whatsapp, cpf, birth_date")
    .in("id", memberIds)
    .eq("role", "membro")
    .order("full_name");

  return profiles ?? [];
}
