import "server-only";

import type { ActivityKind } from "@/lib/editais/activity-kind";
import { validateEditCargo } from "@/lib/editais/cargo-phases";
import { normalizeKiwifyMappingQuota } from "@/lib/editais/enrollment-quota";
import { normalizeSubmissionPeriodDays } from "@/lib/editais/member-phase-deadline";
import type { CargoEditInput, UpdateEditalInput } from "@/lib/editais/types";
import { sanitizePhaseDescriptionHtml } from "@/lib/rich-text/phase-description";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type UpdateEditalResult = { ok: true; message: string } | { ok: false; message: string };

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

function safeSanitizeDescription(raw: string) {
  const trimmed = raw.trim();
  try {
    return sanitizePhaseDescriptionHtml(trimmed);
  } catch (error) {
    console.error("[updateEdital] sanitize failed", error);
    return trimmed;
  }
}

export async function updateEditalCore(
  admin: AdminClient,
  input: UpdateEditalInput,
): Promise<UpdateEditalResult> {
  const title = input.title.trim();
  if (title.length < 3) {
    return { ok: false, message: "Informe o título do edital." };
  }

  const cargoCheck = validateEditCargos(input.cargos);
  if (!cargoCheck.ok) {
    return { ok: false, message: cargoCheck.message };
  }

  const { data: edital } = await admin
    .from("editais")
    .select("id")
    .eq("id", input.editalId)
    .maybeSingle();

  if (!edital) {
    return { ok: false, message: "Edital não encontrado." };
  }

  const submissionPeriodDays = normalizeSubmissionPeriodDays(input.submissionPeriodDays);
  const defaultCorrectionQuota = normalizeKiwifyMappingQuota(input.defaultCorrectionQuota);

  const { error: titleError } = await admin
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

  const { data: existingCargos } = await admin
    .from("edital_cargos")
    .select("id")
    .eq("edital_id", input.editalId);

  const keptCargoIds = new Set(
    input.cargos.map((cargo) => cargo.id).filter((id): id is string => Boolean(id)),
  );

  for (const row of existingCargos ?? []) {
    if (keptCargoIds.has(row.id)) continue;

    const { data: cargoPhases } = await admin
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

    const { error: deleteCargoError } = await admin.from("edital_cargos").delete().eq("id", row.id);

    if (deleteCargoError) {
      return { ok: false, message: "Não foi possível remover o cargo." };
    }
  }

  for (const [cargoIndex, cargo] of input.cargos.entries()) {
    const cargoName = cargo.name.trim().toUpperCase();
    let cargoId = cargo.id;

    if (cargoId) {
      const { error: cargoUpdateError } = await admin
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
      const { data: cargoRow, error: cargoInsertError } = await admin
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

    const { data: existingPhases } = await admin
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

      const { error: deletePhaseError } = await admin
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
      for (const [phaseIndex, phase] of kindPhases.entries()) {
        const phaseTitle = phase.title.trim();
        const phasePayload = {
          cargo_id: cargoId,
          activity_kind: activityKind,
          phase_number: phaseIndex + 1,
          title: phaseTitle,
          description: safeSanitizeDescription(phase.description),
          updated_at: new Date().toISOString(),
        };

        if (phase.id) {
          const { error: phaseUpdateError } = await admin
            .from("edital_phases")
            .update(phasePayload)
            .eq("id", phase.id)
            .eq("cargo_id", cargoId);

          if (phaseUpdateError) {
            console.error("[updateEdital] phase update failed", phaseUpdateError.message);
            return { ok: false, message: "Não foi possível atualizar os temas." };
          }
          continue;
        }

        const { error: phaseInsertError } = await admin.from("edital_phases").insert({
          ...phasePayload,
          deadline_at: null,
        });

        if (phaseInsertError) {
          console.error("[updateEdital] phase insert failed", phaseInsertError.message);
          return { ok: false, message: "Não foi possível atualizar os temas." };
        }
      }
    }
  }

  return { ok: true, message: "Edital atualizado com sucesso." };
}
