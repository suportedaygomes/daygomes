"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import {
  validateEvaluationRubric,
  type EditalEvaluationRubric,
} from "@/lib/editais/evaluation-rubric";
import {
  phasesForCreateCargo,
  validateCreateCargo,
  validateEditCargo,
} from "@/lib/editais/cargo-phases";
import { normalizeKiwifyMappingQuota } from "@/lib/editais/enrollment-quota";
import { normalizeSubmissionPeriodDays } from "@/lib/editais/member-phase-deadline";
import type { ActivityKind } from "@/lib/editais/activity-kind";
import { sanitizePhaseDescriptionHtml } from "@/lib/rich-text/phase-description";
import type { CargoEditInput, CreateEditalInput, PhaseInput, UpdateEditalInput } from "@/lib/editais/types";
import { createAdminClient } from "@/lib/supabase/admin";
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

function validateEditCargos(cargos: CargoEditInput[]) {
  if (!cargos.length) {
    return { ok: false as const, message: "Adicione pelo menos um cargo." };
  }
  for (const cargo of cargos) {
    const check = validateEditCargo(cargo);
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

export async function updateEditalEvaluationRubric(input: {
  editalId: string;
  rubric: EditalEvaluationRubric;
}) {
  const { profile } = await getCurrentProfile();
  if (!requireAdmin(profile)) {
    return { ok: false, message: "Acesso negado." };
  }

  const normalized = normalizeRubricCodes(input.rubric);
  const check = validateEvaluationRubric(normalized);
  if (!check.ok) {
    return { ok: false, message: check.message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("editais")
    .update({
      evaluation_rubric: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.editalId);

  if (error) {
    return { ok: false, message: "Não foi possível salvar os quesitos." };
  }

  return { ok: true, message: "Quesitos avaliativos salvos." };
}

export async function updateEdital(input: UpdateEditalInput) {
  try {
  const { profile } = await getCurrentProfile();
  if (!requireAdmin(profile)) {
    return { ok: false, message: "Acesso negado." };
  }

  const title = input.title.trim();
  if (title.length < 3) {
    return { ok: false, message: "Informe o título do edital." };
  }

  const cargoCheck = validateEditCargos(input.cargos);
  if (!cargoCheck.ok) {
    return { ok: false, message: cargoCheck.message };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: edital } = await supabase
    .from("editais")
    .select("id")
    .eq("id", input.editalId)
    .maybeSingle();

  if (!edital) {
    return { ok: false, message: "Edital não encontrado." };
  }

  const submissionPeriodDays = normalizeSubmissionPeriodDays(input.submissionPeriodDays);
  const defaultCorrectionQuota = normalizeKiwifyMappingQuota(input.defaultCorrectionQuota);

  const { error: titleError } = await supabase
    .from("editais")
    .update({
      title,
      submission_period_days: submissionPeriodDays,
      default_correction_quota: defaultCorrectionQuota,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.editalId);

  if (titleError) {
    return { ok: false, message: "Não foi possível atualizar o título." };
  }

  const { data: existingCargos } = await supabase
    .from("edital_cargos")
    .select("id")
    .eq("edital_id", input.editalId);

  const keptCargoIds = new Set(
    input.cargos.map((cargo) => cargo.id).filter((id): id is string => Boolean(id)),
  );

  for (const row of existingCargos ?? []) {
    if (keptCargoIds.has(row.id)) continue;

    const { data: cargoPhases } = await supabase
      .from("edital_phases")
      .select("id")
      .eq("cargo_id", row.id);

    for (const phase of cargoPhases ?? []) {
      const { count: submissionCount } = await admin
        .from("phase_submissions")
        .select("*", { count: "exact", head: true })
        .eq("phase_id", phase.id);

      if (submissionCount && submissionCount > 0) {
        return {
          ok: false,
          message: "Não é possível remover um cargo que já recebeu envios.",
        };
      }
    }

    const { error: deleteCargoError } = await supabase
      .from("edital_cargos")
      .delete()
      .eq("id", row.id);

    if (deleteCargoError) {
      return { ok: false, message: "Não foi possível remover o cargo." };
    }
  }

  for (const [cargoIndex, cargo] of input.cargos.entries()) {
    const cargoName = cargo.name.trim().toUpperCase();
    let cargoId = cargo.id;

    if (cargoId) {
      const { error: cargoUpdateError } = await supabase
        .from("edital_cargos")
        .update({
          name: cargoName,
          offers_dissertativa: cargo.offersDissertativa,
          offers_estudo_caso: cargo.offersEstudoCaso,
          sort_order: cargoIndex,
        })
        .eq("id", cargoId)
        .eq("edital_id", input.editalId);

      if (cargoUpdateError) {
        return { ok: false, message: "Não foi possível atualizar os cargos." };
      }
    } else {
      const { data: cargoRow, error: cargoInsertError } = await supabase
        .from("edital_cargos")
        .insert({
          edital_id: input.editalId,
          name: cargoName,
          offers_dissertativa: cargo.offersDissertativa,
          offers_estudo_caso: cargo.offersEstudoCaso,
          sort_order: cargoIndex,
        })
        .select("id")
        .single();

      if (cargoInsertError || !cargoRow) {
        return { ok: false, message: "Não foi possível adicionar o cargo." };
      }
      cargoId = cargoRow.id;
    }

    const { data: existingPhases } = await supabase
      .from("edital_phases")
      .select("id")
      .eq("cargo_id", cargoId);

    const keptPhaseIds = new Set(
      cargo.phases.map((phase) => phase.id).filter((id): id is string => Boolean(id)),
    );

    for (const phaseRow of existingPhases ?? []) {
      if (keptPhaseIds.has(phaseRow.id)) continue;

      const { count: submissionCount } = await admin
        .from("phase_submissions")
        .select("*", { count: "exact", head: true })
        .eq("phase_id", phaseRow.id);

      if (submissionCount && submissionCount > 0) {
        return {
          ok: false,
          message: "Não é possível remover um tema que já recebeu envios.",
        };
      }

      const { error: deletePhaseError } = await supabase
        .from("edital_phases")
        .delete()
        .eq("id", phaseRow.id);

      if (deletePhaseError) {
        return { ok: false, message: "Não foi possível remover o tema." };
      }
    }

    const phasesByKind = new Map<ActivityKind, CargoEditInput["phases"]>();
    for (const phase of cargo.phases) {
      const list = phasesByKind.get(phase.activityKind) ?? [];
      list.push(phase);
      phasesByKind.set(phase.activityKind, list);
    }

    for (const [activityKind, kindPhases] of phasesByKind) {
      const phaseResults = await Promise.all(
        kindPhases.map(async (phase, phaseIndex) => {
          const phaseTitle = phase.title.trim();
          const phasePayload = {
            cargo_id: cargoId,
            activity_kind: activityKind,
            phase_number: phaseIndex + 1,
            title: phaseTitle,
            description: sanitizePhaseDescriptionHtml(phase.description.trim()),
            updated_at: new Date().toISOString(),
          };

          if (phase.id) {
            const { error: phaseUpdateError } = await admin
              .from("edital_phases")
              .update(phasePayload)
              .eq("id", phase.id)
              .eq("cargo_id", cargoId);

            return phaseUpdateError;
          }

          const { error: phaseInsertError } = await admin.from("edital_phases").insert({
            ...phasePayload,
            deadline_at: null,
          });

          return phaseInsertError;
        }),
      );

      const phaseError = phaseResults.find(Boolean);
      if (phaseError) {
        console.error("[updateEdital] phase save failed", phaseError.message);
        return { ok: false, message: "Não foi possível atualizar os temas." };
      }
    }
  }

  return { ok: true, message: "Edital atualizado com sucesso." };
  } catch (error) {
    console.error("[updateEdital] unexpected error", error);
    const detail = error instanceof Error ? error.message : String(error);
    if (/body exceeded|too large|payload/i.test(detail)) {
      return {
        ok: false,
        message:
          "O edital é grande demais para enviar de uma vez. Reduza textos longos nos temas ou salve em partes menores.",
      };
    }
    return {
      ok: false,
      message: "Erro inesperado ao salvar o edital. Tente novamente em instantes.",
    };
  }
}
