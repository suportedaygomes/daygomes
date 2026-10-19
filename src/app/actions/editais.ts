"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import {
  validateEvaluationRubric,
  type EditalEvaluationRubric,
} from "@/lib/editais/evaluation-rubric";
import { phasesForCreateCargo, validateCreateCargo } from "@/lib/editais/cargo-phases";
import { normalizeKiwifyMappingQuota } from "@/lib/editais/enrollment-quota";
import { normalizeSubmissionPeriodDays } from "@/lib/editais/member-phase-deadline";
import type { ActivityKind } from "@/lib/editais/activity-kind";
import { sanitizePhaseDescriptionHtml } from "@/lib/rich-text/phase-description";
import type { CreateEditalInput, PhaseInput } from "@/lib/editais/types";
import { createClient } from "@/lib/supabase/server";

function normalizeRubricCodes(rubric: EditalEvaluationRubric): EditalEvaluationRubric {
  return {
    ...rubric,
    quesitos: rubric.quesitos.map((q) => ({
      ...q,
      code: q.code.trim().toUpperCase(),
    })),
  };
}

function prepareEvaluationRubric(
  rubric: EditalEvaluationRubric | null | undefined,
): { ok: true; value: EditalEvaluationRubric | null } | { ok: false; message: string } {
  if (!rubric || !rubric.quesitos.length) {
    return { ok: true, value: null };
  }
  const normalized = normalizeRubricCodes(rubric);
  const check = validateEvaluationRubric(normalized);
  if (!check.ok) return check;
  return { ok: true, value: normalized };
}

function requireAdmin(profile: Awaited<ReturnType<typeof getCurrentProfile>>["profile"]) {
  return profile && profile.role === "admin" && !profile.banned;
}

function validateCreateCargos(cargos: CreateEditalInput["cargos"]) {
  if (!cargos.length) {
    return { ok: false as const, message: "Adicione pelo menos um cargo." };
  }
  for (const cargo of cargos) {
    const check = validateCreateCargo(cargo);
    if (!check.ok) return check;
  }
  return { ok: true as const };
}

async function insertPhasesForCargo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cargoId: string,
  activityKind: ActivityKind,
  phases: PhaseInput[],
) {
  for (const [phaseIndex, phase] of phases.entries()) {
    const { error: phaseError } = await supabase.from("edital_phases").insert({
      cargo_id: cargoId,
      activity_kind: activityKind,
      phase_number: phaseIndex + 1,
      title: phase.title.trim(),
      description: sanitizePhaseDescriptionHtml(phase.description.trim()),
      deadline_at: null,
      updated_at: new Date().toISOString(),
    });

    if (phaseError) {
      return { ok: false as const, message: "Não foi possível salvar os temas." };
    }
  }
  return { ok: true as const };
}

export async function createEdital(input: CreateEditalInput) {
  const { profile } = await getCurrentProfile();
  if (!requireAdmin(profile)) {
    return { ok: false, message: "Acesso negado." };
  }

  const title = input.title.trim();
  if (title.length < 3) {
    return { ok: false, message: "Informe o título do edital." };
  }

  const cargoCheck = validateCreateCargos(input.cargos);
  if (!cargoCheck.ok) {
    return { ok: false, message: cargoCheck.message };
  }

  const rubricResult = prepareEvaluationRubric(input.evaluationRubric);
  if (!rubricResult.ok) {
    return { ok: false, message: rubricResult.message };
  }

  const submissionPeriodDays = normalizeSubmissionPeriodDays(input.submissionPeriodDays);
  const defaultCorrectionQuota = normalizeKiwifyMappingQuota(input.defaultCorrectionQuota);

  const supabase = await createClient();

  const { data: edital, error: editalError } = await supabase
    .from("editais")
    .insert({
      title,
      submission_period_days: submissionPeriodDays,
      default_correction_quota: defaultCorrectionQuota,
      evaluation_rubric: rubricResult.value,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (editalError || !edital) {
    return { ok: false, message: "Não foi possível criar o edital." };
  }

  for (const [cargoIndex, cargo] of input.cargos.entries()) {
    const cargoName = cargo.name.trim().toUpperCase();

    const { data: cargoRow, error: cargoError } = await supabase
      .from("edital_cargos")
      .insert({
        edital_id: edital.id,
        name: cargoName,
        offers_dissertativa: cargo.offersDissertativa,
        offers_estudo_caso: cargo.offersEstudoCaso,
        sort_order: cargoIndex,
      })
      .select("id")
      .single();

    if (cargoError || !cargoRow) {
      return { ok: false, message: "Não foi possível salvar os cargos." };
    }

    for (const block of phasesForCreateCargo(cargo)) {
      const phaseResult = await insertPhasesForCargo(
        supabase,
        cargoRow.id,
        block.activityKind,
        block.phases,
      );
      if (!phaseResult.ok) {
        return { ok: false, message: phaseResult.message };
      }
    }
  }

  revalidatePath("/painel/admin/editais");
  return { ok: true, message: "Edital criado com sucesso.", editalId: edital.id };
}
