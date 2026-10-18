"use client";

import { useState } from "react";
import { CorrectorPublicInline } from "@/components/editais/corrector-public-inline";
import { MembroCorrecaoCardActions } from "@/components/editais/membro-correcao-actions";
import { PhaseDescriptionContent } from "@/components/editais/phase-description-content";
import { MemberPhaseStatusBadge } from "@/components/editais/member-phase-status-badge";
import { themeLabel } from "@/lib/editais/theme-label";

type SubmissionStatus = "enviado" | "em_correcao" | "corrigido" | null;

type MemberPhaseCardProps = {
  enrollmentId: string;
  phaseId: string;
  phaseNumber: number;
  title: string;
  description: string;
  deadlineAt: string;
  submissionStatus: SubmissionStatus;
  submissionId: string | null;
  allowResubmit: boolean;
  resubmitChargesQuota?: boolean;
  quotaBlocksNewUpload?: boolean;
  correction?: {
    grade: number | null;
    feedback: string;
    errorsNotes: string;
  } | null;
  corrector?: {
    fullName: string;
    avatarUrl: string | null;
    bio: string | null;
  } | null;
  trackLabel?: string;
  defaultCollapsed?: boolean;
};

export function MemberPhaseCard({
  enrollmentId,
  phaseId,
  phaseNumber,
  title,
  description,
  deadlineAt,
  submissionStatus,
  submissionId,
  allowResubmit,
  resubmitChargesQuota = false,
  quotaBlocksNewUpload = false,
  correction,
  corrector,
  trackLabel,
  defaultCollapsed = false,
}: MemberPhaseCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const deadline = new Date(deadlineAt);
  const expired = deadline < new Date();
  const awaitingCorrection =
    submissionStatus === "enviado" || submissionStatus === "em_correcao";
  const canUpload =
    !expired &&
    !quotaBlocksNewUpload &&
    (!submissionStatus || (submissionStatus === "corrigido" && allowResubmit));
  const showCorrection =
    correction &&
    !awaitingCorrection &&
    (submissionStatus === "corrigido" || correction.grade != null);

  async function onUpload() {
    if (!file || !canUpload) return;
    setError("");
    setMessage("");
    setPending(true);

    const body = new FormData();
    body.append("enrollmentId", enrollmentId);
    body.append("phaseId", phaseId);
    body.append("file", file);

    const response = await fetch("/api/submissions/upload", {
      method: "POST",
      body,
    });

    const data = (await response.json()) as { error?: string; message?: string };
    if (!response.ok) {
      setError(data.error ?? "Não foi possível enviar.");
      setPending(false);
      return;
    }

    setMessage(data.message ?? "Enviado.");
    setFile(null);
    setPending(false);
    window.location.reload();
  }

  const phaseForBadge = {
    deadlineAt,
    submissionStatus,
    allowResubmit,
    quotaBlocksNewUpload,
  };

  const inner = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-purple">{themeLabel(phaseNumber)}</p>
            <MemberPhaseStatusBadge phase={phaseForBadge} />
            {showCorrection && correction?.grade != null ? (
              <span className="text-sm font-semibold tabular-nums text-emerald-200">
                Nota {correction.grade.toLocaleString("pt-BR")}
              </span>
            ) : null}
          </div>
          {trackLabel ? <p className="text-xs text-muted">{trackLabel}</p> : null}
        </div>
        <p className="text-xs text-muted">
          Prazo: {deadline.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
        </p>
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <PhaseDescriptionContent html={description} />

      {awaitingCorrection ? (
        <p className="text-sm text-beige">
          Atividade enviada. Este tema fica bloqueado até o corretor publicar a correção.
        </p>
      ) : quotaBlocksNewUpload && !submissionStatus ? (
        <p className="text-sm text-amber-200">
          Você já usou todas as correções da mentoria. Escolha outro tema só se o corretor liberar
          reenvio em um tema já enviado.
        </p>
      ) : expired && !submissionStatus ? (
        <p className="text-sm text-red-300">Prazo encerrado.</p>
      ) : canUpload ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {allowResubmit ? (
            <p className="text-sm text-beige sm:basis-full">
              {resubmitChargesQuota
                ? "Reenvio liberado pelo corretor. Este envio usará 1 correção do seu plano."
                : "Reenvio gratuito liberado pelo corretor. Não consome outra correção do plano."}
            </p>
          ) : null}
          <label className="btn-secondary btn-sm w-full cursor-pointer sm:w-auto">
            Escolher arquivo
            <input
              type="file"
              className="sr-only"
              accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError("");
              }}
            />
          </label>
          <button
            type="button"
            className="btn-primary btn-sm w-full sm:w-auto"
            disabled={!file || pending}
            onClick={onUpload}
          >
            {pending ? "Enviando..." : allowResubmit ? "Reenviar atividade" : "Enviar atividade"}
          </button>
        </div>
      ) : submissionStatus === "corrigido" ? (
        <p className="text-sm text-muted">Tema corrigido. Reenvio somente se o corretor liberar.</p>
      ) : null}

      {file ? (
        <p role="status" className="alert-success text-sm">
          Arquivo anexado: {file.name}
        </p>
      ) : null}
      <p className="text-xs text-muted">
        Envie imagem, PDF ou Word (.docx). Documentos viram PDF para o corretor marcar. Até 8 MB.
      </p>

      {showCorrection ? (
        <div className="rounded-xl border border-white/10 bg-field/80 p-4 text-sm">
          <p><strong>Nota:</strong> {correction.grade ?? "—"}</p>
          <p className="mt-2"><strong>Feedback:</strong> {correction.feedback || "—"}</p>
          <p className="mt-2">
            <strong>Comentários técnicos do professor:</strong> {correction.errorsNotes || "—"}
          </p>
          {corrector ? (
            <CorrectorPublicInline
              fullName={corrector.fullName}
              avatarUrl={corrector.avatarUrl}
              bio={corrector.bio}
            />
          ) : (
            <p className="mt-3 border-t border-white/10 pt-3 text-xs text-muted">
              Corrigido pela equipe da Professora Day Gomes
            </p>
          )}
          {submissionId ? <MembroCorrecaoCardActions submissionId={submissionId} /> : null}
        </div>
      ) : null}

      {error ? <p className="alert-error">{error}</p> : null}
      {message ? <p className="alert-success">{message}</p> : null}
    </>
  );

  if (defaultCollapsed && showCorrection) {
    return (
      <details className="panel-card group">
        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">
                {themeLabel(phaseNumber)} · {title}
              </span>
              <MemberPhaseStatusBadge phase={phaseForBadge} />
              {correction?.grade != null ? (
                <span className="text-sm font-semibold tabular-nums text-emerald-200">
                  {correction.grade.toLocaleString("pt-BR")}
                </span>
              ) : null}
            </div>
            <span className="text-xs text-muted group-open:hidden">Ver correção</span>
          </div>
          {trackLabel ? <p className="mt-1 text-xs text-muted">{trackLabel}</p> : null}
        </summary>
        <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4">{inner}</div>
      </details>
    );
  }

  return <article className="panel-card flex flex-col gap-3">{inner}</article>;
}
