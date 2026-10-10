import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/roles";

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  cpf: string | null;
  birth_date: string | null;
  avatar_path: string | null;
  banned: boolean;
};

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, cpf, birth_date, avatar_path, banned")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    profile: profile as ProfileRow | null,
  };
}

export function getAvatarPublicUrl(
  supabaseUrl: string,
  avatarPath: string | null | undefined,
) {
  if (!avatarPath) return null;
  return `${supabaseUrl}/storage/v1/object/public/avatars/${avatarPath}`;
}

export function getDisplayName(user: User, profile: ProfileRow | null) {
  const fullName = profile?.full_name?.trim();
  if (fullName) return fullName;
  return user.email ?? "Usuário";
}
