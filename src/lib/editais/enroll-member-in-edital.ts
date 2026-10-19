import "server-only";

import { normalizeAdminEnrollmentQuota } from "@/lib/editais/enrollment-quota";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type EnrollMemberInEditalInput = {
  memberId: string;
  editalId: string;
  correctionQuota: number;
};

export type EnrollMemberInEditalResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

function enrollmentWriteErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === "23505") {
    return "Este membro já está vinculado a esta mentoria.";
  }
  if (error.code === "23514") {
    return "A quantidade de correções precisa estar entre 1 e 4.";
  }
  if (error.code === "23503") {
    return "Membro ou edital inválido.";
  }
  if (error.code === "23502") {
    if (/cargo_id/i.test(error.message ?? "")) {
      return "Não foi possível vincular: configure ao menos um cargo no edital.";
    }
    return "Não foi possível gravar a inscrição porque falta um campo obrigatório.";
  }
  return "Não foi possível vincular o membro.";
}

function isCargoIdRequiredError(error: { code?: string; message?: string }) {
  return error.code === "23502" && /cargo_id/i.test(error.message ?? "");
}

async function firstCargoIdForEdital(admin: AdminClient, editalId: string) {
  const { data } = await admin
    .from("edital_cargos")
    .select("id")
    .eq("edital_id", editalId)
    .order("sort_order")
    .limit(1);

  return data?.[0]?.id ?? null;
}

async function findExistingEnrollment(
  admin: AdminClient,
  memberId: string,
  editalId: string,
) {
  const { data, error } = await admin
    .from("member_edital_enrollments")
    .select("id")
    .eq("member_id", memberId)
    .eq("edital_id", editalId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    return { existing: null, error };
  }

  return { existing: data?.[0] ?? null, error: null };
}

export async function enrollMemberInEditalCore(
  admin: AdminClient,
  input: EnrollMemberInEditalInput,
): Promise<EnrollMemberInEditalResult> {
  const memberId = input.memberId?.trim();
  const editalId = input.editalId?.trim();

  if (!memberId || !editalId) {
    return { ok: false, message: "Selecione um membro válido." };
  }

  const { data: member, error: memberError } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", memberId)
    .maybeSingle();

  if (memberError || !member || member.role !== "membro") {
    return { ok: false, message: "Selecione um membro válido." };
  }

  const { data: edital, error: editalError } = await admin
    .from("editais")
    .select("id")
    .eq("id", editalId)
    .maybeSingle();

  if (editalError || !edital) {
    return { ok: false, message: "Edital não encontrado." };
  }

  const correctionQuota = normalizeAdminEnrollmentQuota(input.correctionQuota);
  const fallbackCargoId = await firstCargoIdForEdital(admin, editalId);

  const { existing, error: existingError } = await findExistingEnrollment(
    admin,
    memberId,
    editalId,
  );

  if (existingError) {
    console.error("[enrollMemberInEdital] lookup failed", existingError.message);
    return { ok: false, message: "Não foi possível verificar a inscrição." };
  }

  if (existing) {
    const { error } = await admin
      .from("member_edital_enrollments")
      .update({
        cargo_id: fallbackCargoId,
        correction_quota: correctionQuota,
      })
      .eq("id", existing.id);

    if (error) {
      console.error("[enrollMemberInEdital] update failed", error.code, error.message);
      return { ok: false, message: enrollmentWriteErrorMessage(error) };
    }

    return {
      ok: true,
      message: "Membro já estava na mentoria. A cota de correções foi atualizada.",
    };
  }

  let insertError = (
    await admin.from("member_edital_enrollments").insert({
      member_id: memberId,
      edital_id: editalId,
      cargo_id: null,
      correction_quota: correctionQuota,
    })
  ).error;

  if (insertError && isCargoIdRequiredError(insertError) && fallbackCargoId) {
    insertError = (
      await admin.from("member_edital_enrollments").insert({
        member_id: memberId,
        edital_id: editalId,
        cargo_id: fallbackCargoId,
        correction_quota: correctionQuota,
      })
    ).error;
  }

  if (insertError) {
    console.error("[enrollMemberInEdital] insert failed", insertError.code, insertError.message);
    return { ok: false, message: enrollmentWriteErrorMessage(insertError) };
  }

  return { ok: true, message: "Membro vinculado à mentoria." };
}
