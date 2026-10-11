import type { PendingSubmissionListRow } from "@/lib/corrector/pending-queue";

export type EditalCargoQueueSummary = {
  cargoId: string;
  cargoName: string;
  pendingCount: number;
  nearestDeadlineAt: string | null;
};

export type EditalQueueSummary = {
  editalId: string;
  editalTitle: string;
  pendingCount: number;
  nearestDeadlineAt: string | null;
  cargos: EditalCargoQueueSummary[];
};

function minDeadline(dates: (string | null | undefined)[]): string | null {
  const valid = dates.filter(Boolean) as string[];
  if (!valid.length) return null;
  valid.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  return valid[0];
}

export function buildEditalQueueSummaries(
  rows: PendingSubmissionListRow[],
): EditalQueueSummary[] {
  const byEdital = new Map<string, PendingSubmissionListRow[]>();

  for (const row of rows) {
    const list = byEdital.get(row.editalId) ?? [];
    list.push(row);
    byEdital.set(row.editalId, list);
  }

  const summaries: EditalQueueSummary[] = [];

  for (const [, items] of byEdital) {
    const first = items[0];
    const cargoMap = new Map<string, PendingSubmissionListRow[]>();
    for (const item of items) {
      const list = cargoMap.get(item.cargoId) ?? [];
      list.push(item);
      cargoMap.set(item.cargoId, list);
    }

    const cargos: EditalCargoQueueSummary[] = [];
    for (const [, cargoItems] of cargoMap) {
      const sample = cargoItems[0];
      cargos.push({
        cargoId: sample.cargoId,
        cargoName: sample.cargoName,
        pendingCount: cargoItems.length,
        nearestDeadlineAt: minDeadline(cargoItems.map((r) => r.phaseDeadlineAt)),
      });
    }

    cargos.sort((a, b) => a.cargoName.localeCompare(b.cargoName, "pt-BR"));

    summaries.push({
      editalId: first.editalId,
      editalTitle: first.editalTitle,
      pendingCount: items.length,
      nearestDeadlineAt: minDeadline(items.map((r) => r.phaseDeadlineAt)),
      cargos,
    });
  }

  summaries.sort((a, b) => a.editalTitle.localeCompare(b.editalTitle, "pt-BR"));
  return summaries;
}

export type CorrectorListFilters = {
  editalId: string;
  cargoId: string;
  memberQuery: string;
};

export type CorrectorQueueFilters = CorrectorListFilters & {
  submissionKind: "all" | "primeiro" | "reenvio";
};

export function filterCorrectorListRows<
  T extends { editalId: string; cargoId: string; memberName: string },
>(rows: T[], filters: CorrectorListFilters): T[] {
  const q = filters.memberQuery.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.editalId && row.editalId !== filters.editalId) return false;
    if (filters.cargoId && row.cargoId !== filters.cargoId) return false;
    if (q && !row.memberName.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function filterPendingSubmissions(
  rows: PendingSubmissionListRow[],
  filters: CorrectorQueueFilters,
): PendingSubmissionListRow[] {
  return filterCorrectorListRows(rows, filters).filter((row) => {
    if (filters.submissionKind === "primeiro" && row.isResubmit) return false;
    if (filters.submissionKind === "reenvio" && !row.isResubmit) return false;
    return true;
  });
}

export type CorrectedQueueFilters = CorrectorListFilters & {
  resubmitReleased: "all" | "yes";
  correctorId: string;
};

export function filterCorrectedSubmissions<
  T extends {
    editalId: string;
    cargoId: string;
    memberName: string;
    allowResubmit: boolean;
    correctorId: string;
  },
>(rows: T[], filters: CorrectedQueueFilters): T[] {
  return filterCorrectorListRows(rows, filters).filter((row) => {
    if (filters.resubmitReleased === "yes" && !row.allowResubmit) return false;
    if (filters.correctorId && row.correctorId !== filters.correctorId) return false;
    return true;
  });
}

export function buildEditalCountSummaries<
  T extends { editalId: string; editalTitle: string; cargoId: string; cargoName: string },
>(rows: T[]) {
  const byEdital = new Map<string, T[]>();
  for (const row of rows) {
    const list = byEdital.get(row.editalId) ?? [];
    list.push(row);
    byEdital.set(row.editalId, list);
  }

  const summaries: {
    editalId: string;
    editalTitle: string;
    count: number;
    cargos: { cargoId: string; cargoName: string; count: number }[];
  }[] = [];

  for (const [, items] of byEdital) {
    const first = items[0];
    const cargoMap = new Map<string, T[]>();
    for (const item of items) {
      const list = cargoMap.get(item.cargoId) ?? [];
      list.push(item);
      cargoMap.set(item.cargoId, list);
    }

    const cargos = [...cargoMap.entries()].map(([cargoId, cargoItems]) => ({
      cargoId,
      cargoName: cargoItems[0].cargoName,
      count: cargoItems.length,
    }));
    cargos.sort((a, b) => a.cargoName.localeCompare(b.cargoName, "pt-BR"));

    summaries.push({
      editalId: first.editalId,
      editalTitle: first.editalTitle,
      count: items.length,
      cargos,
    });
  }

  summaries.sort((a, b) => a.editalTitle.localeCompare(b.editalTitle, "pt-BR"));
  return summaries;
}
