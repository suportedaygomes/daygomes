import "server-only";

import { unwrapSingle } from "@/lib/corrector/submission-row-utils";
import type { ActivityKind } from "@/lib/editais/activity-kind";
import { activityKindShortLabel, cargoDisplayName } from "@/lib/editais/activity-kind";
import { themeLabel } from "@/lib/editais/theme-label";
import { createAdminClient } from "@/lib/supabase/admin";

export type MemberEditalPriorGrade = {
  submissionId: string;
  phaseTitle: string;
  themeLabel: string;
  trackLabel: string;
  grade: number;
  correctedAt: string;
};

export type MemberEditalPriorGrades = {
  editalTitle: string;
  grades: MemberEditalPriorGrade[];
};

export async function loadMemberEditalPriorGrades(
  submissionId: string,
  memberId: string,
  editalId: string,
): Promise<MemberEditalPriorGrades | null> {
  const admin = createAdminClient();

  const { data: edital } = await admin
    .from("editais")
    .select("title")
    .eq("id", editalId)
    .maybeSingle();

  const { data: enrollmentRows } = await admin
    .from("member_edital_enrollments")
    .select("id")
    .eq("member_id", memberId)
    .eq("edital_id", editalId);

  const enrollmentIds = (enrollmentRows ?? []).map((row) => row.id);
  if (!enrollmentIds.length) {
    return edital?.title
      ? { editalTitle: edital.title, grades: [] }
      : null;
  }

  const { data: rows, error } = await admin
    .from("phase_submissions")
    .select(
      `id, status, phase_corrections(grade, updated_at), edital_phases(title, phase_number, activity_kind, edital_cargos(name))`,
    )
    .eq("member_id", memberId)
    .in("enrollment_id", enrollmentIds)
    .eq("status", "corrigido")
    .neq("id", submissionId)
    .order("submitted_at", { ascending: true });

  if (error) {
    console.error("[loadMemberEditalPriorGrades]", error.message);
    return null;
  }

  const grades: MemberEditalPriorGrade[] = [];

  for (const row of rows ?? []) {
    const correction = Array.isArray(row.phase_corrections)
      ? row.phase_corrections[0]
      : row.phase_corrections;
    const gradeRaw = correction?.grade;
    const grade =
      gradeRaw === null || gradeRaw === undefined ? null : Number.parseFloat(String(gradeRaw));
    if (grade === null || !Number.isFinite(grade)) continue;

    const phase = unwrapSingle(row.edital_phases);
    if (!phase) continue;

    const cargo = unwrapSingle(phase.edital_cargos);
    const activityKind = (phase.activity_kind as ActivityKind | undefined) ?? "dissertativa";
    const trackLabel = cargo?.name
      ? cargoDisplayName(cargo.name, activityKind)
      : activityKindShortLabel(activityKind);

    grades.push({
      submissionId: row.id,
      phaseTitle: phase.title?.trim() || "Tema",
      themeLabel: themeLabel(phase.phase_number ?? 0),
      trackLabel,
      grade,
      correctedAt: correction?.updated_at ?? "",
    });
  }

  grades.sort((a, b) => {
    const ta = a.correctedAt ? Date.parse(a.correctedAt) : 0;
    const tb = b.correctedAt ? Date.parse(b.correctedAt) : 0;
    return ta - tb;
  });

  if (!edital?.title && !grades.length) {
    return null;
  }

  return {
    editalTitle: edital?.title?.trim() || "Edital",
    grades,
  };
}