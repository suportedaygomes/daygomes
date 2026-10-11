"use client";

import { useState } from "react";
import { CorrectorPublicInline } from "@/components/editais/corrector-public-inline";
import { MembroCorrecaoCardActions } from "@/components/editais/membro-correcao-actions";

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
  correction,
  corrector,
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

  return (
    <article className="panel-card flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-purple">Fase {phaseNumber}</p>
        <p className="text-xs text-muted">
          Prazo: {deadline.toLocaleString("pt-BR")}
        </p>
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm leading-6 text-muted">{description}</p>

      {awaitingCorrection ? (
        <p className="text-sm text-beige">
          Atividade enviada. Esta fase fica bloqueada até o corretor publicar a correção.
        </p>
      ) : expired && !submissionStatus ? (
        <p className="text-sm text-red-300">Prazo encerrado.</p>
      ) : canUpload ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {allowResubmit ? (
            <p className="text-sm text-beige sm:basis-full">
              Reenvio liberado pelo corretor. Envie a atividade novamente nesta fase.
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
        <p className="text-sm text-muted">Fase corrigida. Aguarde a liberação da próxima fase.</p>
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
          <p className="mt-2"><strong>Erros apontados:</strong> {correction.errorsNotes || "—"}</p>
          {corrector ? (
            <CorrectorPublicInline
              fullName={corrector.fullName}
              avatarUrl={corrector.avatarUrl}
              bio={corrector.bio}
            />
          ) : (
            <p className="mt-3 border-t border-white/10 pt-3 text-xs text-muted">
              Corrigido pela equipe Day Gomes
            </p>
          )}
          {submissionId ? <MembroCorrecaoCardActions submissionId={submissionId} /> : null}
        </div>
      ) : null}

      {error ? <p className="alert-error">{error}</p> : null}
      {message ? <p className="alert-success">{message}</p> : null}
    </article>
  );
}
