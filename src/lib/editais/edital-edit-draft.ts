import type { CargoEditInput } from "@/lib/editais/types";

export type EditalEditFormSnapshot = {
  title: string;
  submissionPeriodDays: number;
  defaultCorrectionQuota: number;
  cargos: CargoEditInput[];
};

export type EditalEditDraft = EditalEditFormSnapshot & {
  /** `editais.updated_at` da versão publicada quando o rascunho começou / foi sincronizado. */
  publishedRevision: string;
  savedAt: string;
};

export function editalEditDraftStorageKey(editalId: string) {
  return `edital-edit-draft:${editalId}`;
}

export function readEditalEditDraft(editalId: string): EditalEditDraft | null {
  try {
    const raw = localStorage.getItem(editalEditDraftStorageKey(editalId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EditalEditDraft;
    if (!parsed || typeof parsed.publishedRevision !== "string" || !Array.isArray(parsed.cargos)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeEditalEditDraft(editalId: string, draft: EditalEditDraft) {
  localStorage.setItem(editalEditDraftStorageKey(editalId), JSON.stringify(draft));
}

export function clearEditalEditDraft(editalId: string) {
  localStorage.removeItem(editalEditDraftStorageKey(editalId));
}

export function snapshotsEqual(a: EditalEditFormSnapshot, b: EditalEditFormSnapshot) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function hasEditalEditDraftChanges(
  published: EditalEditFormSnapshot,
  current: EditalEditFormSnapshot,
) {
  return !snapshotsEqual(published, current);
}
