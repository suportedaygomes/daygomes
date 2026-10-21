import "server-only";

import type { ActivityKind } from "@/lib/editais/activity-kind";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export function phaseTrackKey(cargoId: string, activityKind: ActivityKind): string {
  return `${cargoId}:${activityKind}`;
}

export async function countPhasesInTrack(
  admin: AdminClient,
  cargoId: string,
  activityKind: ActivityKind,
  cache: Map<string, number>,
): Promise<number> {
  const key = phaseTrackKey(cargoId, activityKind);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const { count } = await admin
    .from("edital_phases")
    .select("*", { count: "exact", head: true })
    .eq("cargo_id", cargoId)
    .eq("activity_kind", activityKind);

  const total = count ?? 0;
  cache.set(key, total);
  return total;
}
