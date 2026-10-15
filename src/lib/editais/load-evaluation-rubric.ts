import {
  parseEvaluationRubric,
  type EditalEvaluationRubric,
} from "@/lib/editais/evaluation-rubric";
import { createAdminClient } from "@/lib/supabase/admin";

export async function loadEvaluationRubricForSubmission(
  submissionId: string,
): Promise<EditalEvaluationRubric | null> {
  const admin = createAdminClient();
  const { data: submission } = await admin
    .from("phase_submissions")
    .select("phase_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission?.phase_id) return null;

  const { data: phase } = await admin
    .from("edital_phases")
    .select("cargo_id")
    .eq("id", submission.phase_id)
    .maybeSingle();

  if (!phase?.cargo_id) return null;

  const { data: cargo } = await admin
    .from("edital_cargos")
    .select("edital_id")
    .eq("id", phase.cargo_id)
    .maybeSingle();

  if (!cargo?.edital_id) return null;

  const { data: edital } = await admin
    .from("editais")
    .select("evaluation_rubric")
    .eq("id", cargo.edital_id)
    .maybeSingle();

  return parseEvaluationRubric(edital?.evaluation_rubric);
}

export async function loadEvaluationRubricForEdital(
  editalId: string,
): Promise<EditalEvaluationRubric | null> {
  const admin = createAdminClient();
  const { data: edital } = await admin
    .from("editais")
    .select("evaluation_rubric")
    .eq("id", editalId)
    .maybeSingle();

  return parseEvaluationRubric(edital?.evaluation_rubric);
}
