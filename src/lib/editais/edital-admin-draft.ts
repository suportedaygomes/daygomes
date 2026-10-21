import type { EditalEvaluationRubric } from "@/lib/editais/evaluation-rubric";
import type { EditalEditFormSnapshot } from "@/lib/editais/edital-edit-draft";

export type EditalAdminDraftRow = {
  edital_id: string;
  published_revision: string;
  structure: EditalEditFormSnapshot | null;
  evaluation_rubric: EditalEvaluationRubric | null;
  updated_at: string;
  updated_by: string | null;
};

export type EditalAdminDraftView = {
  publishedRevision: string;
  structure: EditalEditFormSnapshot | null;
  evaluationRubric: EditalEvaluationRubric | null;
  updatedAt: string;
};

export type EditalAdminDraftPatch = {
  publishedRevision: string;
  structure?: EditalEditFormSnapshot | null;
  evaluationRubric?: EditalEvaluationRubric | null;
};

export function mapEditalAdminDraft(row: EditalAdminDraftRow): EditalAdminDraftView {
  return {
    publishedRevision: row.published_revision,
    structure: row.structure,
    evaluationRubric: row.evaluation_rubric,
    updatedAt: row.updated_at,
  };
}

export function rubricsEqual(a: EditalEvaluationRubric, b: EditalEvaluationRubric) {
  return JSON.stringify(a) === JSON.stringify(b);
}
