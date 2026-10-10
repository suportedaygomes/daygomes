"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export async function saveCorrection(input: {
  submissionId: string;
  grade: number;
  feedback: string;
  errorsNotes: string;
  unlockNextPhase: boolean;
}) {
  const { user, profile } = await getCurrentProfile();

  if (!user || !profile || profile.banned) {
    return { ok: false, message: "Sessão inválida." };
  }

  if (profile.role !== "corretor" && profile.role !== "admin") {
    return { ok: false, message: "Acesso negado." };
  }

  const grade = Number(input.grade);
  if (!Number.isFinite(grade) || grade < 0 || grade > 1000) {
    return { ok: false, message: "A nota deve estar entre 0 e 1000." };
  }

  const supabase = await createClient();

  const { data: submission } = await supabase
    .from("phase_submissions")
    .select("id, enrollment_id, phase_id, status")
    .eq("id", input.submissionId)
    .maybeSingle();

  if (!submission) {
    return { ok: false, message: "Envio não encontrado." };
  }

  const { data: existing } = await supabase
    .from("phase_corrections")
    .select("id")
    .eq("submission_id", submission.id)
    .maybeSingle();

  const payload = {
    submission_id: submission.id,
    corrector_id: user.id,
    grade,
    feedback: input.feedback.trim(),
    errors_notes: input.errorsNotes.trim(),
    next_phase_unlocked: input.unlockNextPhase,
    updated_at: new Date().toISOString(),
  };

  const { error: correctionError } = existing
    ? await supabase.from("phase_corrections").update(payload).eq("id", existing.id)
    : await supabase.from("phase_corrections").insert(payload);

  if (correctionError) {
    return { ok: false, message: "Não foi possível salvar a correção." };
  }

  await supabase
    .from("phase_submissions")
    .update({ status: "corrigido" })
    .eq("id", submission.id);

  if (input.unlockNextPhase) {
    const { data: currentPhase } = await supabase
      .from("edital_phases")
      .select("cargo_id, phase_number")
      .eq("id", submission.phase_id)
      .single();

    if (currentPhase) {
      const { data: nextPhase } = await supabase
        .from("edital_phases")
        .select("id")
        .eq("cargo_id", currentPhase.cargo_id)
        .eq("phase_number", currentPhase.phase_number + 1)
        .maybeSingle();

      if (nextPhase) {
        await supabase.from("member_phase_access").upsert(
          {
            enrollment_id: submission.enrollment_id,
            phase_id: nextPhase.id,
            unlocked_by: user.id,
            unlocked_at: new Date().toISOString(),
          },
          { onConflict: "enrollment_id,phase_id" },
        );
      }
    }
  }

  revalidatePath("/painel/correcoes");
  revalidatePath(`/painel/correcoes/${submission.id}`);
  revalidatePath("/painel/editais");
  return { ok: true, message: "Correção salva." };
}
