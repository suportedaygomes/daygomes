"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { saveCorrection } from "@/app/actions/corrections";
import { ReturnToQueueButton } from "@/components/editais/return-to-queue-button";

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
    allowResubmit: boolean;
  };
  canReturnToQueue?: boolean;
};

export function CorrectionForm({
  submissionId,
  memberName,
  phaseTitle,
  downloadUrl,
  initial,
  canReturnToQueue = false,
}: CorrectionFormProps) {
  const [grade, setGrade] = useState(initial?.grade?.toString() ?? "");
  const [feedback, setFeedback] = useState(initial?.feedback ?? "");
  const [errorsNotes, setErrorsNotes] = useState(initial?.errorsNotes ?? "");
  const initialUnlock = Boolean(initial?.nextPhaseUnlocked) && !initial?.allowResubmit;
  const initialResubmit = Boolean(initial?.allowResubmit) && !initial?.nextPhaseUnlocked;
  const [unlockNextPhase, setUnlockNextPhase] = useState(initialUnlock);
  const [allowResubmit, setAllowResubmit] = useState(initialResubmit);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!unlockNextPhase && !allowResubmit) {
      setError("Selecione liberar a próxima fase ou liberar reenvio desta fase.");
      return;
    }

    setPending(true);

    const result = await saveCorrection({
      submissionId,
      grade: Number(grade),
      feedback,
      errorsNotes,
      unlockNextPhase,
      allowResubmit,
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

      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/painel/correcoes/${submissionId}/anotar`} className="btn-primary w-fit">
          Marcar redação
        </Link>
        {downloadUrl ? (
          <a href={downloadUrl} target="_blank" rel="noreferrer" className="btn-secondary w-fit">
            Baixar arquivo original
          </a>
        ) : null}
        {canReturnToQueue ? <ReturnToQueueButton submissionId={submissionId} /> : null}
      </div>

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

      <fieldset className="flex flex-col gap-3 rounded-xl border border-[color:var(--border-subtle)] p-4">
        <legend className="px-1 text-sm font-medium">Após a correção</legend>
        <p className="text-xs text-muted">
          Selecione uma opção (obrigatório). Próxima fase e reenvio não podem ser marcados juntos.
        </p>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={unlockNextPhase}
            onChange={(event) => {
              const checked = event.target.checked;
              setUnlockNextPhase(checked);
              if (checked) setAllowResubmit(false);
            }}
          />
          <span>Liberar próxima fase para este aluno</span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={allowResubmit}
            onChange={(event) => {
              const checked = event.target.checked;
              setAllowResubmit(checked);
              if (checked) setUnlockNextPhase(false);
            }}
          />
          <span>Liberar reenvio desta fase (aluno envia de novo aqui)</span>
        </label>
      </fieldset>

      {error ? <p className="alert-error">{error}</p> : null}
      {message ? <p className="alert-success">{message}</p> : null}

      <button type="submit" disabled={pending} className="btn-primary w-fit">
        {pending ? "Salvando..." : "Salvar correção"}
      </button>
    </form>
  );
}
