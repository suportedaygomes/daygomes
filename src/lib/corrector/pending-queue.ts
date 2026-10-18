import type { ProfileRow } from "@/lib/auth/profile";
import { submissionMemberProfileEmbed } from "@/lib/corrector/submission-select";
import { unwrapSingle } from "@/lib/corrector/submission-row-utils";
import { activityKindShortLabel, cargoDisplayName } from "@/lib/editais/activity-kind";
import type { ActivityKind } from "@/lib/editais/activity-kind";
import { createAdminClient } from "@/lib/supabase/admin";

export type PendingSubmissionListRow = {
  id: string;
  member_id: string;
  status: string;
  assigned_corrector_id: string | null;
  submitted_at: string;
  memberName: string;
  editalId: string;
  editalTitle: string;
  cargoId: string;
  cargoName: string;
  phaseTitle: string;
  phaseNumber: number | null;
  phaseDeadlineAt: string;
  isResubmit: boolean;
};

function correctorSeesInQueue(
  row: { status: string; assigned_corrector_id: string | null },
  correctorId: string,
) {
  if (row.status !== "enviado" && row.status !== "em_correcao") return false;
  if (!row.assigned_corrector_id) {
    return row.status === "enviado";
  }
  return row.assigned_corrector_id === correctorId;
}

export async function listPendingSubmissionsForStaff(
  profile: Pick<ProfileRow, "id" | "role">,
): Promise<PendingSubmissionListRow[]> {
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("phase_submissions")
    .select(
      `id, member_id, status, assigned_corrector_id, submitted_at, ${submissionMemberProfileEmbed}, edital_phases(title, phase_number, deadline_at, activity_kind, edital_cargos(id, name, edital_id, editais(title))), member_edital_enrollments!phase_submissions_enrollment_id_fkey(edital_id)`,
    )
    .in("status", ["enviado", "em_correcao"])
    .order("submitted_at", { ascending: true });

  if (error) {
    throw new Error(`Fila de correções: ${error.message}`);
  }

  const visible =
    profile.role === "admin"
      ? rows ?? []
      : (rows ?? []).filter((row) => correctorSeesInQueue(row, profile.id));

  const ids = visible.map((row) => row.id);
  const resubmitIds = new Set<string>();
  if (ids.length) {
    const { data: corrections } = await admin
      .from("phase_corrections")
      .select("submission_id")
      .in("submission_id", ids);
    for (const item of corrections ?? []) {
      resubmitIds.add(item.submission_id);
    }
  }

  return visible.map((row) => {
    const member = unwrapSingle(row.profiles);
    const phase = unwrapSingle(row.edital_phases);
    const enrollment = unwrapSingle(row.member_edital_enrollments);
    const cargo = phase ? unwrapSingle(phase.edital_cargos) : null;
    const edital = cargo ? unwrapSingle(cargo.editais) : null;
    const activityKind = (phase?.activity_kind as ActivityKind | undefined) ?? "dissertativa";
    const cargoName = cargo?.name
      ? cargoDisplayName(cargo.name, activityKind)
      : activityKindShortLabel(activityKind);

    return {
      id: row.id,
      member_id: row.member_id,
      status: row.status,
      assigned_corrector_id: row.assigned_corrector_id,
      submitted_at: row.submitted_at,
      memberName: member?.full_name ?? "Aluno",
      editalId: enrollment?.edital_id ?? cargo?.edital_id ?? "",
      editalTitle: edital?.title ?? "Edital",
      cargoId: cargo?.id ?? "",
      cargoName,
      phaseTitle: phase?.title ?? "Tema",
      phaseNumber: phase?.phase_number ?? null,
      phaseDeadlineAt: phase?.deadline_at ?? "",
      isResubmit: resubmitIds.has(row.id),
    };
  });
}
