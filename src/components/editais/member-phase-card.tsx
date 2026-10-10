"use client";

import { useState } from "react";

type MemberPhaseCardProps = {
  enrollmentId: string;
  phaseId: string;
  phaseNumber: number;
  title: string;
  description: string;
  deadlineAt: string;
  submitted: boolean;
  correction?: {
    grade: number | null;
    feedback: string;
    errorsNotes: string;
  } | null;
};

export function MemberPhaseCard({
  enrollmentId,
  phaseId,
  phaseNumber,
  title,
  description,
  deadlineAt,
  submitted,
  correction,
}: MemberPhaseCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const deadline = new Date(deadlineAt);
  const expired = deadline < new Date();

  async function onUpload() {
    if (!file || submitted || expired) return;
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

      {submitted ? (
        <p className="text-sm text-beige">Atividade enviada. Aguarde a correção.</p>
      ) : expired ? (
        <p className="text-sm text-red-300">Prazo encerrado.</p>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="btn-secondary cursor-pointer">
            Escolher arquivo
            <input
              type="file"
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            className="btn-primary"
            disabled={!file || pending}
            onClick={onUpload}
          >
            {pending ? "Enviando..." : "Enviar atividade"}
          </button>
        </div>
      )}

      {file ? <p className="text-xs text-muted">Arquivo: {file.name}</p> : null}
      <p className="text-xs text-muted">
        Imagens são otimizadas automaticamente. Outros formatos até 8 MB.
      </p>

      {correction ? (
        <div className="rounded-xl border border-purple/30 bg-purple/10 p-3 text-sm">
          <p><strong>Nota:</strong> {correction.grade ?? "—"}</p>
          <p className="mt-2"><strong>Feedback:</strong> {correction.feedback || "—"}</p>
          <p className="mt-2"><strong>Erros apontados:</strong> {correction.errorsNotes || "—"}</p>
        </div>
      ) : null}

      {error ? <p className="alert-error">{error}</p> : null}
      {message ? <p className="alert-success">{message}</p> : null}
    </article>
  );
}
