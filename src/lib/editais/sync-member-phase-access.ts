import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Garante linhas em member_phase_access para todos os temas do edital da inscrição. */
export async function syncMemberPhaseAccessForEnrollment(
  admin: AdminClient,
  enrollmentId: string,
): Promise<void> {
  const { data: enrollment } = await admin
    .from("member_edital_enrollments")
    .select("id, edital_id, created_at")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (!enrollment) return;

  const { data: cargos } = await admin
    .from("edital_cargos")
    .select("id")
    .eq("edital_id", enrollment.edital_id);

  const cargoIds = (cargos ?? []).map((c) => c.id);
  if (!cargoIds.length) return;

  const { data: phases } = await admin
    .from("edital_phases")
    .select("id")
    .in("cargo_id", cargoIds);

  const unlockedAt = enrollment.created_at ?? new Date().toISOString();
  const rows = (phases ?? []).map((phase) => ({
    enrollment_id: enrollmentId,
    phase_id: phase.id,
    unlocked_at: unlockedAt,
  }));

  if (!rows.length) return;

  const { error } = await admin.from("member_phase_access").upsert(rows, {
    onConflict: "enrollment_id,phase_id",
    ignoreDuplicates: true,
  });

  if (error) {
    console.error("[syncMemberPhaseAccess] enrollment", enrollmentId, error.message);
  }
}

/** Após publicar edital ou criar temas novos, libera acesso para inscrições existentes. */
export async function syncMemberPhaseAccessForEdital(
  admin: AdminClient,
  editalId: string,
): Promise<void> {
  const { data: enrollments } = await admin
    .from("member_edital_enrollments")
    .select("id")
    .eq("edital_id", editalId);

  for (const enrollment of enrollments ?? []) {
    await syncMemberPhaseAccessForEnrollment(admin, enrollment.id);
  }
}
