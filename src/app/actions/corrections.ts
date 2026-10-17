"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { claimSubmissionForCorrector } from "@/lib/corrector/submission-assignment";
import { sendCorrectionNoticeEmail } from "@/lib/email/send-correction-notice-email";
import {
  buildRubricFeedbackSummary,
  computeFinalGrade,
  validateRubricScores,
  type RubricScores,
} from "@/lib/editais/evaluation-rubric";
import { loadEvaluationRubricForSubmission } from "@/lib/editais/load-evaluation-rubric";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function saveCorrection(input: {
  submissionId: string;
  grade?: number;
  feedback?: string;
  rubricScores?: RubricScores;
  errorsNotes: string;
  resubmitMode: "none" | "free" | "charged";
}) {
  const { user, profile } = await getCurrentProfile();

  if (!user || !profile || profile.banned) {
    return { ok: false, message: "Sessão inválida." };
  }

  if (profile.role !== "corretor" && profile.role !== "admin") {
    return { ok: false, message: "Acesso negado." };
  }

  const rubric = await loadEvaluationRubricForSubmission(input.submissionId);

  let grade: number;
  let feedback: string;
  let rubricScores: RubricScores | null = null;

  if (rubric) {
    if (!input.rubricScores) {
      return { ok: false, message: "Preencha a nota de cada quesito avaliativo." };
    }
    const scoresCheck = validateRubricScores(rubric, input.rubricScores);
    if (!scoresCheck.ok) {
      return { ok: false, message: scoresCheck.message };
    }
    rubricScores = scoresCheck.normalized;
    grade = computeFinalGrade(rubric, rubricScores);
    feedback = buildRubricFeedbackSummary(rubric, rubricScores, grade);
  } else {
    const manualGrade = Number(input.grade);
    if (!Number.isFinite(manualGrade) || manualGrade < 0 || manualGrade > 1000) {
      return { ok: false, message: "A nota deve estar entre 0 e 1000." };
    }
    grade = manualGrade;
    feedback = (input.feedback ?? "").trim();
    if (!feedback) {
      return { ok: false, message: "Informe a descrição da correção." };
    }
  }

  const allowResubmit = input.resubmitMode !== "none";
  const resubmitChargesQuota = input.resubmitMode === "charged";

  const admin = createAdminClient();

  const { data: submission } = await admin
    .from("phase_submissions")
    .select("id, enrollment_id, phase_id, status, member_id, assigned_corrector_id")
    .eq("id", input.submissionId)
    .maybeSingle();

  if (!submission) {
    return { ok: false, message: "Envio não encontrado." };
  }

  if (submission.status === "enviado" || submission.status === "em_correcao") {
    const claim = await claimSubmissionForCorrector(
      input.submissionId,
      user.id,
      profile.role,
    );
    if (!claim.ok) {
      if (claim.code === "locked") {
        return {
          ok: false,
          message: "Esta atividade já está em correção com outro corretor.",
        };
      }
      return { ok: false, message: "Envio não disponível para correção." };
    }
  } else if (submission.status === "corrigido" && profile.role !== "admin") {
    const { data: prior } = await admin
      .from("phase_corrections")
      .select("corrector_id")
      .eq("submission_id", submission.id)
      .maybeSingle();
    const ownerId = submission.assigned_corrector_id ?? prior?.corrector_id;
    if (ownerId && ownerId !== user.id) {
      return { ok: false, message: "Somente quem corrigiu pode alterar esta atividade." };
    }
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("phase_corrections")
    .select("id")
    .eq("submission_id", submission.id)
    .maybeSingle();

  const payload = {
    submission_id: submission.id,
    corrector_id: user.id,
    grade,
    feedback,
    errors_notes: input.errorsNotes.trim(),
    rubric_scores: rubricScores,
    next_phase_unlocked: false,
    allow_resubmit: allowResubmit,
    resubmit_charges_quota: resubmitChargesQuota,
    updated_at: new Date().toISOString(),
  };

  const { error: correctionError } = existing
    ? await supabase.from("phase_corrections").update(payload).eq("id", existing.id)
    : await supabase.from("phase_corrections").insert(payload);

  if (correctionError) {
    return { ok: false, message: "Não foi possível salvar a correção." };
  }

  if (allowResubmit) {
    await admin
      .from("phase_submission_reminders")
      .delete()
      .eq("enrollment_id", submission.enrollment_id)
      .eq("phase_id", submission.phase_id);
  }

  await admin
    .from("phase_submissions")
    .update({
      status: "corrigido",
      assigned_corrector_id: user.id,
    })
    .eq("id", submission.id);

  revalidatePath("/painel");
  revalidatePath("/painel/correcoes");
  revalidatePath(`/painel/correcoes/${submission.id}`);
  revalidatePath("/painel/editais");
  revalidatePath(`/painel/editais/correcao/${submission.id}`);

  let emailWarning: string | undefined;
  const { data: memberProfile } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", submission.member_id)
    .maybeSingle();

  const { data: phaseRow } = await supabase
    .from("edital_phases")
    .select("title, phase_number, edital_cargos(editais(title))")
    .eq("id", submission.phase_id)
    .maybeSingle();

  const cargo = Array.isArray(phaseRow?.edital_cargos)
    ? phaseRow.edital_cargos[0]
    : phaseRow?.edital_cargos;
  const edital = Array.isArray(cargo?.editais) ? cargo.editais[0] : cargo?.editais;

  const memberEmail = memberProfile?.email?.trim().toLowerCase();
  if (memberEmail) {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
      /\/$/,
      "",
    );
    const emailResult = await sendCorrectionNoticeEmail({
      to: memberEmail,
      fullName: memberProfile?.full_name ?? "",
      editalTitle: edital?.title ?? "Edital",
      phaseTitle: phaseRow?.title ?? "Atividade",
      phaseNumber: phaseRow?.phase_number ?? 0,
      grade,
      correctionUrl: `${siteUrl}/painel/editais/correcao/${submission.id}`,
    });
    if (!emailResult.ok) {
      emailWarning = emailResult.error;
    }
  }

  return {
    ok: true,
    message: emailWarning
      ? `Correção salva, mas o e-mail ao aluno não foi enviado (${emailWarning}).`
      : memberEmail
        ? "Correção salva. O aluno foi avisado por e-mail."
        : "Correção salva.",
  };
}
