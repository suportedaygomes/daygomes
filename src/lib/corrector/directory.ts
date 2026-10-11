import { ageFromBirthDate } from "@/lib/dates/age";
import { createAdminClient } from "@/lib/supabase/admin";

export type CorrectorDirectoryEntry = {
  id: string;
  fullName: string;
  email: string | null;
  bio: string | null;
  age: number | null;
  avatarPath: string | null;
};

export async function listCorrectorDirectoryEntries(): Promise<CorrectorDirectoryEntry[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, email, bio, birth_date, avatar_path, role, banned")
    .eq("role", "corretor")
    .eq("banned", false)
    .order("full_name", { ascending: true });

  const entries: CorrectorDirectoryEntry[] = [];

  for (const row of data ?? []) {
    if (row.role !== "corretor") continue;
    if (row.banned) continue;

    entries.push({
      id: row.id,
      fullName: row.full_name?.trim() || "Corretor",
      email: row.email?.trim() || null,
      bio: row.bio?.trim() || null,
      age: ageFromBirthDate(row.birth_date),
      avatarPath: row.avatar_path,
    });
  }

  return entries;
}
