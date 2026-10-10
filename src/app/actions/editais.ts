"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import type { CreateEditalInput } from "@/lib/editais/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function requireAdmin(profile: Awaited<ReturnType<typeof getCurrentProfile>>["profile"]) {
  return profile && profile.role === "admin" && !profile.banned;
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

  if (!input.cargos.length) {
    return { ok: false, message: "Adicione pelo menos um cargo." };
  }

  const supabase = await createClient();

  const { data: edital, error: editalError } = await supabase
    .from("editais")
    .insert({ title, updated_at: new Date().toISOString() })
    .select("id")
    .single();

  if (editalError || !edital) {
    return { ok: false, message: "Não foi possível criar o edital." };
  }

  for (const [cargoIndex, cargo] of input.cargos.entries()) {
    const cargoName = cargo.name.trim().toUpperCase();
    if (!cargoName) {
      return { ok: false, message: "Nome do cargo inválido." };
    }

    const vacancyCount = Number(cargo.vacancyCount);
    if (!Number.isFinite(vacancyCount) || vacancyCount < 1) {
      return { ok: false, message: `Quantidade inválida para ${cargoName}.` };
    }

    if (!cargo.phases.length) {
      return { ok: false, message: `Adicione fases para o cargo ${cargoName}.` };
    }

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
      if (!phaseTitle) {
        return { ok: false, message: "Título da fase é obrigatório." };
      }

      if (!phase.deadlineAt) {
        return { ok: false, message: "Informe o prazo de cada fase." };
      }

      const deadline = new Date(phase.deadlineAt);
      if (Number.isNaN(deadline.getTime())) {
        return { ok: false, message: "Prazo da fase inválido." };
      }

      const { error: phaseError } = await supabase.from("edital_phases").insert({
        cargo_id: cargoRow.id,
        phase_number: phaseIndex + 1,
        title: phaseTitle,
        description: phase.description.trim(),
        deadline_at: deadline.toISOString(),
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

  const { error } = await admin.from("member_edital_enrollments").insert({
    member_id: input.memberId,
    edital_id: input.editalId,
    cargo_id: input.cargoId,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Este membro já está vinculado a este cargo." };
    }
    return { ok: false, message: "Não foi possível vincular o membro." };
  }

  revalidatePath(`/painel/admin/editais/${input.editalId}`);
  return { ok: true, message: "Membro vinculado ao edital." };
}
