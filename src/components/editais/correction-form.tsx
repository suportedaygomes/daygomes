"use client";

import { FormEvent, useState } from "react";
import { saveCorrection } from "@/app/actions/corrections";

type CorrectionFormProps = {
  submissionId: string;
  memberName: string;
  phaseTitle: string;
  downloadUrl: string | null;
  initial?: {
    grade: number | null;
    feedback: string;
    errorsNotes: string;
    nextPhaseUnlocked: boolean;
  };
};

export function CorrectionForm({
  submissionId,
  memberName,
  phaseTitle,
  downloadUrl,
  initial,
}: CorrectionFormProps) {
  const [grade, setGrade] = useState(initial?.grade?.toString() ?? "");
  const [feedback, setFeedback] = useState(initial?.feedback ?? "");
  const [errorsNotes, setErrorsNotes] = useState(initial?.errorsNotes ?? "");
  const [unlockNextPhase, setUnlockNextPhase] = useState(initial?.nextPhaseUnlocked ?? false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);

    const result = await saveCorrection({
      submissionId,
      grade: Number(grade),
      feedback,
      errorsNotes,
      unlockNextPhase,
    });

    if (!result.ok) {
      setError(result.message);
    } else {
      setMessage(result.message);
    }
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="panel-card flex flex-col gap-4">
      <div>
        <p className="text-sm text-muted">Aluno</p>
        <p className="font-semibold">{memberName}</p>
        <p className="mt-2 text-sm text-muted">Fase</p>
        <p className="font-medium">{phaseTitle}</p>
      </div>

      {downloadUrl ? (
        <a href={downloadUrl} target="_blank" rel="noreferrer" className="btn-secondary w-fit">
          Abrir envio do aluno
        </a>
      ) : null}

      <label className="flex flex-col gap-2 text-sm font-medium">
        Nota (0 a 1000)
        <input
          type="number"
          min={0}
          max={1000}
          step={0.1}
          className="field-input"
          value={grade}
          onChange={(event) => setGrade(event.target.value)}
          required
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium">
        Descrição da correção
        <textarea
          className="field-input min-h-28 resize-y py-3"
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          required
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium">
        Erros apontados
        <textarea
          className="field-input min-h-28 resize-y py-3"
          value={errorsNotes}
          onChange={(event) => setErrorsNotes(event.target.value)}
          required
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={unlockNextPhase}
          onChange={(event) => setUnlockNextPhase(event.target.checked)}
        />
        Liberar próxima fase para este aluno
      </label>

      {error ? <p className="alert-error">{error}</p> : null}
      {message ? <p className="alert-success">{message}</p> : null}

      <button type="submit" disabled={pending} className="btn-primary w-fit">
        {pending ? "Salvando..." : "Salvar correção"}
      </button>
    </form>
  );
}
