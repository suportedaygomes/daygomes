import { NextResponse } from "next/server";
import { prepareSubmission } from "@/lib/files/prepare-submission";
import { isR2Configured } from "@/lib/r2/config";
import {
  deleteR2Object,
  putR2Object,
  submissionObjectKey,
  submissionPreviewPdfKey,
} from "@/lib/r2/storage";
import {
  correctionsRemaining,
  countEnrollmentCorrectionQuotaUsed,
} from "@/lib/editais/enrollment-quota";
import {
  isMemberPhaseDeadlineExpired,
  normalizeSubmissionPeriodDays,
  resolveMemberPhaseDeadlineAt,
} from "@/lib/editais/member-phase-deadline";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const form = await request.formData();
  const enrollmentId = String(form.get("enrollmentId") ?? "");
  const phaseId = String(form.get("phaseId") ?? "");
  const file = form.get("file");

  if (!enrollmentId || !phaseId || !(file instanceof File)) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const { data: enrollment } = await supabase
    .from("member_edital_enrollments")
    .select("id, member_id, edital_id, correction_quota, created_at, editais(submission_period_days)")
    .eq("id", enrollmentId)
    .eq("member_id", user.id)
    .maybeSingle();

  if (!enrollment) {
    return NextResponse.json({ error: "Inscrição inválida." }, { status: 403 });
  }

  const { data: phase } = await supabase
    .from("edital_phases")
    .select("id, deadline_at, cargo_id, activity_kind, phase_number, edital_cargos(edital_id)")
    .eq("id", phaseId)
    .maybeSingle();

  if (!phase) {
    return NextResponse.json({ error: "Tema inválido." }, { status: 400 });
  }

  const cargo = Array.isArray(phase.edital_cargos)
    ? phase.edital_cargos[0]
    : phase.edital_cargos;

  if (!cargo || cargo.edital_id !== enrollment.edital_id) {
    return NextResponse.json({ error: "Este tema não pertence à sua mentoria." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { count: phasesInTrack } = await admin
    .from("edital_phases")
    .select("*", { count: "exact", head: true })
    .eq("cargo_id", phase.cargo_id)
    .eq("activity_kind", phase.activity_kind);

  const editalRow = Array.isArray(enrollment.editais)
    ? enrollment.editais[0]
    : enrollment.editais;
  const submissionPeriodDays = normalizeSubmissionPeriodDays(editalRow?.submission_period_days);

  const deadlineAt = resolveMemberPhaseDeadlineAt({
    enrolledAt: enrollment.created_at,
    phaseNumber: phase.phase_number,
    submissionPeriodDays,
    phasesInCargo: phasesInTrack ?? 0,
    legacyDeadlineAt: phase.deadline_at,
  });

  if (isMemberPhaseDeadlineExpired(deadlineAt)) {
    return NextResponse.json({ error: "O prazo deste tema já encerrou." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("phase_submissions")
    .select("id, status, storage_path, preview_storage_path")
    .eq("enrollment_id", enrollmentId)
    .eq("phase_id", phaseId)
    .maybeSingle();

  if (existing) {
    const pending =
      existing.status === "enviado" || existing.status === "em_correcao";
    if (pending) {
      return NextResponse.json(
        { error: "Atividade enviada. Aguarde a correção para este tema." },
        { status: 400 },
      );
    }

    if (existing.status === "corrigido") {
      const { data: correction } = await supabase
        .from("phase_corrections")
        .select("allow_resubmit, resubmit_charges_quota")
        .eq("submission_id", existing.id)
        .maybeSingle();

      if (!correction?.allow_resubmit) {
        return NextResponse.json(
          { error: "Este tema já foi corrigido. Reenvio não liberado." },
          { status: 400 },
        );
      }

      if (correction.resubmit_charges_quota) {
        const used = await countEnrollmentCorrectionQuotaUsed(enrollmentId);
        const remaining = correctionsRemaining(enrollment.correction_quota, used);
        if (remaining <= 0) {
          return NextResponse.json(
            {
              error:
                "Você não tem correções disponíveis no plano para este reenvio. O corretor liberou reenvio com consumo de cota.",
            },
            { status: 400 },
          );
        }
      }
    } else {
      return NextResponse.json({ error: "Você já enviou este tema." }, { status: 400 });
    }
  } else {
    const used = await countEnrollmentCorrectionQuotaUsed(enrollmentId);
    const remaining = correctionsRemaining(enrollment.correction_quota, used);
    if (remaining <= 0) {
      return NextResponse.json(
        {
          error:
            "Você já utilizou todas as correções incluídas na sua mentoria. Escolha outro tema apenas se o corretor liberar reenvio.",
        },
        { status: 400 },
      );
    }
  }

  const prepared = await prepareSubmission(file);
  if ("error" in prepared) {
    return NextResponse.json({ error: prepared.error }, { status: 400 });
  }

  if (!isR2Configured()) {
    return NextResponse.json({ error: "Armazenamento não configurado." }, { status: 503 });
  }

  const storagePath = submissionObjectKey(
    user.id,
    enrollmentId,
    phaseId,
    prepared.originalExtension,
  );
  const previewPath = prepared.previewBuffer
    ? submissionPreviewPdfKey(user.id, enrollmentId, phaseId)
    : null;

  const originalUpload = await putR2Object({
    key: storagePath,
    body: prepared.originalBuffer,
    contentType: prepared.originalMime,
  });

  if (!originalUpload.ok) {
    return NextResponse.json({ error: "Falha ao enviar o arquivo." }, { status: 500 });
  }

  if (prepared.previewBuffer && previewPath) {
    const previewUpload = await putR2Object({
      key: previewPath,
      body: prepared.previewBuffer,
      contentType: "application/pdf",
    });
    if (!previewUpload.ok) {
      await deleteR2Object(storagePath).catch(() => undefined);
      return NextResponse.json({ error: "Falha ao gerar PDF para correção." }, { status: 500 });
    }
  }

  const row = {
    storage_path: storagePath,
    preview_storage_path: previewPath,
    original_filename: file.name,
    mime_type: prepared.originalMime,
    file_size: prepared.originalBuffer.length,
    status: "enviado" as const,
    submitted_at: new Date().toISOString(),
    assigned_corrector_id: null,
  };

  if (existing) {
    const previousPath = existing.storage_path;
    const previousPreview = existing.preview_storage_path;

    const { error: updateError } = await admin
      .from("phase_submissions")
      .update(row)
      .eq("id", existing.id)
      .eq("member_id", user.id);

    if (updateError) {
      await deleteR2Object(storagePath).catch(() => undefined);
      if (previewPath) await deleteR2Object(previewPath).catch(() => undefined);
      return NextResponse.json({ error: "Não foi possível registrar o reenvio." }, { status: 500 });
    }

    const { data: correctionBeforeResubmit } = await admin
      .from("phase_corrections")
      .select("resubmit_charges_quota")
      .eq("submission_id", existing.id)
      .maybeSingle();

    await admin
      .from("phase_corrections")
      .update({
        allow_resubmit: false,
        resubmit_charges_quota: false,
        updated_at: new Date().toISOString(),
      })
      .eq("submission_id", existing.id);

    if (correctionBeforeResubmit?.resubmit_charges_quota) {
      const { error: chargeError } = await admin
        .from("enrollment_correction_quota_charges")
        .insert({
          enrollment_id: enrollmentId,
          phase_id: phaseId,
          submission_id: existing.id,
        });

      if (chargeError) {
        console.error("[submissions:upload] quota charge insert failed", chargeError.message);
        return NextResponse.json(
          { error: "Não foi possível registrar o uso da cota." },
          { status: 500 },
        );
      }
    }

    if (previousPath && previousPath !== storagePath) {
      await deleteR2Object(previousPath).catch(() => undefined);
    }
    if (previousPreview && previousPreview !== previewPath) {
      await deleteR2Object(previousPreview).catch(() => undefined);
    }

    return NextResponse.json({ ok: true, message: "Atividade reenviada com sucesso." });
  }

  const { error: insertError } = await supabase.from("phase_submissions").insert({
    enrollment_id: enrollmentId,
    phase_id: phaseId,
    member_id: user.id,
    ...row,
  });

  if (insertError) {
    await deleteR2Object(storagePath).catch(() => undefined);
    if (previewPath) await deleteR2Object(previewPath).catch(() => undefined);
    return NextResponse.json({ error: "Não foi possível registrar o envio." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Atividade enviada com sucesso." });
}
