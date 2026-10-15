"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import {
  validateEvaluationRubric,
  type EditalEvaluationRubric,
} from "@/lib/editais/evaluation-rubric";
import { normalizeSubmissionPeriodDays } from "@/lib/editais/member-phase-deadline";
import { unlockFirstPhaseForEnrollment } from "@/lib/editais/phase-access-unlock";
import type { CargoEditInput, CreateEditalInput, UpdateEditalInput } from "@/lib/editais/types";
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

function validateCargoPhases(cargos: CargoEditInput[]) {
  if (!cargos.length) {
    return { ok: false as const, message: "Adicione pelo menos um cargo." };
  }

  for (const cargo of cargos) {
    const cargoName = cargo.name.trim().toUpperCase();
    if (!cargoName) {
      return { ok: false as const, message: "Nome do cargo inválido." };
    }

    const vacancyCount = Number(cargo.vacancyCount);
    if (!Number.isFinite(vacancyCount) || vacancyCount < 1) {
      return { ok: false as const, message: `Quantidade inválida para ${cargoName}.` };
    }

    if (!cargo.phases.length) {
      return { ok: false as const, message: `Adicione fases para o cargo ${cargoName}.` };
    }

    for (const phase of cargo.phases) {
      if (!phase.title.trim()) {
        return { ok: false as const, message: "Título da fase é obrigatório." };
      }
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

  const cargoCheck = validateCargoPhases(input.cargos);
  if (!cargoCheck.ok) {
    return { ok: false, message: cargoCheck.message };
  }

  const rubricResult = prepareEvaluationRubric(input.evaluationRubric);
  if (!rubricResult.ok) {
    return { ok: false, message: rubricResult.message };
  }

  const submissionPeriodDays = normalizeSubmissionPeriodDays(input.submissionPeriodDays);

  const supabase = await createClient();

  const { data: edital, error: editalError } = await supabase
    .from("editais")
    .insert({
      title,
      submission_period_days: submissionPeriodDays,
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
    const vacancyCount = Number(cargo.vacancyCount);

    const { data: cargoRow, error: cargoError } = await supabase
      .from("edital_cargos")
      .insert({
        edital_id: edital.id,
        name: cargoName,
        vacancy_count: vacancyCount,
        sort_order: cargoIndex,
      })
      .select("id")
      .single();

    if (cargoError || !cargoRow) {
      return { ok: false, message: "Não foi possível salvar os cargos." };
    }

    for (const [phaseIndex, phase] of cargo.phases.entries()) {
      const phaseTitle = phase.title.trim();

      const { error: phaseError } = await supabase.from("edital_phases").insert({
        cargo_id: cargoRow.id,
        phase_number: phaseIndex + 1,
        title: phaseTitle,
        description: phase.description.trim(),
        deadline_at: null,
        updated_at: new Date().toISOString(),
      });

      if (phaseError) {
        return { ok: false, message: "Não foi possível salvar as fases." };
      }
    }
  }

  revalidatePath("/painel/admin/editais");
  return { ok: true, message: "Edital criado com sucesso.", editalId: edital.id };
}

export async function enrollMemberInEdital(input: {
  memberId: string;
  editalId: string;
  cargoId: string;
}) {
  const { profile } = await getCurrentProfile();
  if (!requireAdmin(profile)) {
    return { ok: false, message: "Acesso negado." };
  }

  const admin = createAdminClient();

  const { data: member } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", input.memberId)
    .maybeSingle();

  if (!member || member.role !== "membro") {
    return { ok: false, message: "Selecione um membro válido." };
  }

  const { data: cargo } = await admin
    .from("edital_cargos")
    .select("id, edital_id")
    .eq("id", input.cargoId)
    .eq("edital_id", input.editalId)
    .maybeSingle();

  if (!cargo) {
    return { ok: false, message: "Cargo não pertence a este edital." };
  }

  const { data: enrollment, error } = await admin
    .from("member_edital_enrollments")
    .insert({
      member_id: input.memberId,
      edital_id: input.editalId,
      cargo_id: input.cargoId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Este membro já está vinculado a este cargo." };
    }
    return { ok: false, message: "Não foi possível vincular o membro." };
  }

  if (enrollment) {
    await unlockFirstPhaseForEnrollment(admin, enrollment.id, input.cargoId, profile?.id);
  }

  revalidatePath(`/painel/admin/editais/${input.editalId}`);
  revalidatePath("/painel/editais");
  return { ok: true, message: "Membro vinculado ao edital." };
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

  revalidatePath(`/painel/admin/editais/${input.editalId}`);
  revalidatePath("/painel/correcoes");
  return { ok: true, message: "Quesitos avaliativos salvos." };
}

export async function updateEdital(input: UpdateEditalInput) {
  const { profile } = await getCurrentProfile();
  if (!requireAdmin(profile)) {
    return { ok: false, message: "Acesso negado." };
  }

  const title = input.title.trim();
  if (title.length < 3) {
    return { ok: false, message: "Informe o título do edital." };
  }

  const cargoCheck = validateCargoPhases(input.cargos);
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

  const { error: titleError } = await supabase
    .from("editais")
    .update({
      title,
      submission_period_days: submissionPeriodDays,
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

    const { count: enrollmentCount } = await admin
      .from("member_edital_enrollments")
      .select("*", { count: "exact", head: true })
      .eq("cargo_id", row.id);

    if (enrollmentCount && enrollmentCount > 0) {
      return {
        ok: false,
        message: "Não é possível remover um cargo com membros inscritos.",
      };
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
    const vacancyCount = Number(cargo.vacancyCount);
    let cargoId = cargo.id;

    if (cargoId) {
      const { error: cargoUpdateError } = await supabase
        .from("edital_cargos")
        .update({
          name: cargoName,
          vacancy_count: vacancyCount,
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
          vacancy_count: vacancyCount,
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
          message: "Não é possível remover uma fase que já recebeu envios.",
        };
      }

      const { error: deletePhaseError } = await supabase
        .from("edital_phases")
        .delete()
        .eq("id", phaseRow.id);

      if (deletePhaseError) {
        return { ok: false, message: "Não foi possível remover a fase." };
      }
    }

    for (const [phaseIndex, phase] of cargo.phases.entries()) {
      const phaseTitle = phase.title.trim();
      const phasePayload = {
        cargo_id: cargoId,
        phase_number: phaseIndex + 1,
        title: phaseTitle,
        description: phase.description.trim(),
        updated_at: new Date().toISOString(),
      };

      if (phase.id) {
        const { error: phaseUpdateError } = await supabase
          .from("edital_phases")
          .update(phasePayload)
          .eq("id", phase.id)
          .eq("cargo_id", cargoId);

        if (phaseUpdateError) {
          return { ok: false, message: "Não foi possível atualizar as fases." };
        }
      } else {
        const { error: phaseInsertError } = await supabase.from("edital_phases").insert({
          ...phasePayload,
          deadline_at: null,
        });

        if (phaseInsertError) {
          return { ok: false, message: "Não foi possível adicionar a fase." };
        }
      }
    }
  }

  revalidatePath("/painel/admin/editais");
  revalidatePath(`/painel/admin/editais/${input.editalId}`);
  revalidatePath("/painel/editais");
  return { ok: true, message: "Edital atualizado com sucesso." };
}
