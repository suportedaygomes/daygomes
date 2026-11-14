import { unwrapSingle } from "@/lib/corrector/submission-row-utils";
import { submissionMemberProfileEmbed } from "@/lib/corrector/submission-select";
import { dateRangeSaoPauloUtc, periodLabelPt } from "@/lib/admin/month-range-sao-paulo";
import { createAdminClient } from "@/lib/supabase/admin";

export type CorrectorEditalCount = {
  editalId: string;
  editalTitle: string;
  count: number;
};

export type CorrectorMemberEditalCount = {
  editalId: string;
  editalTitle: string;
  count: number;
};

export type CorrectorMemberDetail = {
  memberId: string;
  memberName: string;
  total: number;
  byEdital: CorrectorMemberEditalCount[];
};

export type CorrectorProductivityRow = {
  correctorId: string;
  correctorName: string;
  role: string;
  totalInPeriod: number;
  byEdital: CorrectorEditalCount[];
  byMember: CorrectorMemberDetail[];
};

export type CorrectorProductivityReport = {
  dateFrom: string;
  dateTo: string;
  periodLabel: string;
  rows: CorrectorProductivityRow[];
  grandTotal: number;
};

const REPORT_LIMIT = 5_000;

function sortByCountDesc<T extends { count: number; editalTitle?: string }>(items: T[]) {
  return [...items].sort((a, b) => b.count - a.count || (a.editalTitle ?? "").localeCompare(b.editalTitle ?? ""));
}

function sortMembers(items: CorrectorMemberDetail[]) {
  return [...items].sort((a, b) => b.total - a.total || a.memberName.localeCompare(b.memberName, "pt-BR"));
}

export async function loadCorrectorProductivityReport(
  dateFrom: string,
  dateTo: string,
): Promise<CorrectorProductivityReport> {
  const admin = createAdminClient();
  const range = dateRangeSaoPauloUtc(dateFrom, dateTo);
  const { gte, lt, dateFrom: from, dateTo: to } = range;

  const { data: correctors } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .eq("role", "corretor")
    .eq("banned", false)
    .order("full_name", { ascending: true });

  const { data: corrections, error } = await admin
    .from("phase_corrections")
    .select(
      `corrector_id, updated_at, profiles!phase_corrections_corrector_id_fkey(full_name, role), phase_submissions!inner(id, member_id, ${submissionMemberProfileEmbed}, member_edital_enrollments!phase_submissions_enrollment_id_fkey(edital_id), edital_phases(edital_cargos(edital_id, editais(title))))`,
    )
    .gte("updated_at", gte)
    .lt("updated_at", lt)
    .order("updated_at", { ascending: false })
    .limit(REPORT_LIMIT);

  if (error) {
    throw new Error(`Relatório de corretores: ${error.message}`);
  }

  type Agg = {
    correctorName: string;
    role: string;
    total: number;
    byEdital: Map<string, { title: string; count: number }>;
    byMember: Map<
      string,
      { name: string; total: number; editais: Map<string, { title: string; count: number }> }
    >;
  };

  const agg = new Map<string, Agg>();

  for (const row of corrections ?? []) {
    const correctorId = row.corrector_id;
    if (!correctorId) continue;

    const correctorProfile = unwrapSingle(row.profiles);
    const submission = unwrapSingle(row.phase_submissions);
    if (!submission) continue;

    const member = unwrapSingle(submission.profiles);
    const phase = unwrapSingle(submission.edital_phases);
    const cargo = phase ? unwrapSingle(phase.edital_cargos) : null;
    const edital = cargo ? unwrapSingle(cargo.editais) : null;
    const enrollment = unwrapSingle(submission.member_edital_enrollments);

    const editalId = enrollment?.edital_id ?? cargo?.edital_id ?? "unknown";
    const editalTitle = edital?.title ?? "Edital";
    const memberId = submission.member_id ?? "unknown";
    const memberName = member?.full_name?.trim() || "Aluno";

    let bucket = agg.get(correctorId);
    if (!bucket) {
      bucket = {
        correctorName: correctorProfile?.full_name?.trim() || "Corretor",
        role: correctorProfile?.role ?? "corretor",
        total: 0,
        byEdital: new Map(),
        byMember: new Map(),
      };
      agg.set(correctorId, bucket);
    }

    bucket.total += 1;

    const editalBucket = bucket.byEdital.get(editalId) ?? { title: editalTitle, count: 0 };
    editalBucket.count += 1;
    bucket.byEdital.set(editalId, editalBucket);

    const memberBucket = bucket.byMember.get(memberId) ?? {
      name: memberName,
      total: 0,
      editais: new Map(),
    };
    memberBucket.total += 1;
    const memberEdital = memberBucket.editais.get(editalId) ?? { title: editalTitle, count: 0 };
    memberEdital.count += 1;
    memberBucket.editais.set(editalId, memberEdital);
    bucket.byMember.set(memberId, memberBucket);
  }

  const correctorIds = new Set((correctors ?? []).map((c) => c.id));

  for (const corrector of correctors ?? []) {
    if (!agg.has(corrector.id)) {
      agg.set(corrector.id, {
        correctorName: corrector.full_name?.trim() || "Corretor",
        role: corrector.role,
        total: 0,
        byEdital: new Map(),
        byMember: new Map(),
      });
    }
  }

  const rows: CorrectorProductivityRow[] = [];

  for (const [correctorId, bucket] of agg) {
    if (!correctorIds.has(correctorId) && bucket.role !== "corretor") {
      continue;
    }
    if (correctorIds.has(correctorId) || bucket.total > 0) {
      rows.push({
        correctorId,
        correctorName: bucket.correctorName,
        role: bucket.role,
        totalInPeriod: bucket.total,
        byEdital: sortByCountDesc(
          [...bucket.byEdital.entries()].map(([editalId, item]) => ({
            editalId,
            editalTitle: item.title,
            count: item.count,
          })),
        ),
        byMember: sortMembers(
          [...bucket.byMember.entries()].map(([memberId, item]) => ({
            memberId,
            memberName: item.name,
            total: item.total,
            byEdital: sortByCountDesc(
              [...item.editais.entries()].map(([editalId, ed]) => ({
                editalId,
                editalTitle: ed.title,
                count: ed.count,
              })),
            ),
          })),
        ),
      });
    }
  }

  rows.sort(
    (a, b) => b.totalInPeriod - a.totalInPeriod || a.correctorName.localeCompare(b.correctorName, "pt-BR"),
  );

  const grandTotal = rows.reduce((sum, row) => sum + row.totalInPeriod, 0);

  return {
    dateFrom: from,
    dateTo: to,
    periodLabel: periodLabelPt(from, to),
    rows,
    grandTotal,
  };
}
