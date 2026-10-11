import type { CorrectorPublicProfile } from "@/lib/corrector/public-profile";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getCorrectorPublicProfilesByIds(
  ids: string[],
): Promise<Map<string, CorrectorPublicProfile>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, CorrectorPublicProfile>();
  if (!unique.length) return map;

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("profiles")
    .select("id, full_name, bio, avatar_path, role")
    .in("id", unique);

  for (const row of rows ?? []) {
    if (row.role !== "corretor" && row.role !== "admin") continue;
    map.set(row.id, {
      id: row.id,
      fullName: row.full_name?.trim() || "Corretor",
      bio: row.bio?.trim() || null,
      avatarPath: row.avatar_path,
    });
  }

  return map;
}
