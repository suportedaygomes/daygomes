import { createAdminClient } from "@/lib/supabase/admin";

export type CorrectorPublicProfile = {
  id: string;
  fullName: string;
  bio: string | null;
  avatarPath: string | null;
};

export async function getCorrectorPublicProfile(
  correctorId: string | null | undefined,
): Promise<CorrectorPublicProfile | null> {
  if (!correctorId) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, bio, avatar_path, role")
    .eq("id", correctorId)
    .maybeSingle();

  if (!data || (data.role !== "corretor" && data.role !== "admin")) {
    return null;
  }

  return {
    id: data.id,
    fullName: data.full_name?.trim() || "Corretor",
    bio: data.bio?.trim() || null,
    avatarPath: data.avatar_path,
  };
}
