import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/roles";

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  cpf: string | null;
  whatsapp: string | null;
  bio: string | null;
  birth_date: string | null;
  avatar_path: string | null;
  banned: boolean;
};

export const getCurrentProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { user: null, profile: null, profileLoadFailed: false };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, cpf, whatsapp, bio, birth_date, avatar_path, banned")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    profile: profile as ProfileRow | null,
    profileLoadFailed: Boolean(profileError),
  };
});

const LEGACY_AVATAR_PATH = /^[0-9a-f-]{36}\/avatar\./i;

export function getAvatarPublicUrl(
  supabaseUrl: string,
  avatarPath: string | null | undefined,
) {
  if (!avatarPath) return null;

  if (avatarPath.startsWith("avatars/")) {
    return `/api/files/avatar?key=${encodeURIComponent(avatarPath)}`;
  }

  if (LEGACY_AVATAR_PATH.test(avatarPath)) {
    return `${supabaseUrl}/storage/v1/object/public/avatars/${avatarPath}`;
  }

  return `/api/files/avatar?key=${encodeURIComponent(avatarPath)}`;
}

export function getDisplayName(user: User, profile: ProfileRow | null) {
  const fullName = profile?.full_name?.trim();
  if (fullName) return fullName;
  return user.email ?? "Usuário";
}
