import "server-only";

import {
  validateEvaluationRubric,
  type EditalEvaluationRubric,
} from "@/lib/editais/evaluation-rubric";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

function normalizeRubricCodes(rubric: EditalEvaluationRubric): EditalEvaluationRubric {
  return {
    ...rubric,
    quesitos: rubric.quesitos.map((q) => ({
      ...q,
      code: q.code.trim().toUpperCase(),
    })),
  };
}

export async function updateEditalEvaluationRubricCore(
  admin: AdminClient,
  editalId: string,
  rubric: EditalEvaluationRubric,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const normalized = normalizeRubricCodes(rubric);
  const check = validateEvaluationRubric(normalized);
  if (!check.ok) {
    return { ok: false, message: check.message };
  }

  const { error } = await admin
    .from("editais")
    .update({
      evaluation_rubric: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq("id", editalId);

  if (error) {
    return { ok: false, message: "Não foi possível salvar os quesitos." };
  }

  return { ok: true, message: "Quesitos avaliativos salvos." };
}
