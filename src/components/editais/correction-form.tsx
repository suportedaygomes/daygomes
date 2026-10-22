"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { releaseCorrectionToQueue, saveCorrection } from "@/app/actions/corrections";
import { CorrectionRubricPanel } from "@/components/editais/correction-rubric-panel";
import type { EditalEvaluationRubric, RubricScores } from "@/lib/editais/evaluation-rubric";

export type CorrectionResubmitMode = "none" | "free" | "charged";

type CorrectionFormProps = {
  submissionId: string;
  memberName: string;
  phaseTitle: string;
  downloadUrl: string | null;
  canReleaseToQueue?: boolean;
  evaluationRubric?: EditalEvaluationRubric | null;
  initial?: {
    grade: number | null;
    feedback: string;
    errorsNotes: string;
    rubricScores?: RubricScores | null;
    resubmitMode?: CorrectionResubmitMode;
  };
};

function initialResubmitMode(initial?: CorrectionFormProps["initial"]): CorrectionResubmitMode {
  if (!initial?.resubmitMode) return "none";
  return initial.resubmitMode;
}

export function CorrectionForm({
  submissionId,
  memberName,
  phaseTitle,
  downloadUrl,
  canReleaseToQueue = false,
  evaluationRubric,
  initial,
}: CorrectionFormProps) {
  const router = useRouter();
  const hasRubric = Boolean(evaluationRubric?.quesitos.length);

  const [grade, setGrade] = useState(initial?.grade?.toString() ?? "");
  const [feedback, setFeedback] = useState(initial?.feedback ?? "");
  const [rubricScores, setRubricScores] = useState<RubricScores>(
    initial?.rubricScores ?? {},
  );
  const [errorsNotes, setErrorsNotes] = useState(initial?.errorsNotes ?? "");
  const [resubmitMode, setResubmitMode] = useState<CorrectionResubmitMode>(
    initialResubmitMode(initial),
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [releasePending, setReleasePending] = useState(false);

  async function onReleaseToQueue() {
    if (
      !window.confirm(
        "Devolver esta atividade à fila? Outro corretor (ou você depois) poderá pegá-la de novo.",
      )
    ) {
      return;
    }
    setError("");
    setMessage("");
    setReleasePending(true);
    try {
      const result = await releaseCorrectionToQueue(submissionId);
      if (!result.ok) {
        setError(result.message);
      } else {
        router.push("/painel/correcoes");
        router.refresh();
      }
    } catch {
      setError("Não foi possível devolver à fila. Verifique a conexão e tente novamente.");
    } finally {
      setReleasePending(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    setPending(true);
    try {
      const result = await saveCorrection({
        submissionId,
        grade: hasRubric ? undefined : Number(grade),
        feedback: hasRubric ? undefined : feedback,
        rubricScores: hasRubric ? rubricScores : undefined,
        errorsNotes,
        resubmitMode,
      });

      if (!result.ok) {
        setError(result.message);
      } else {
        setMessage(result.message);
      }
    } catch {
      setError("Não foi possível salvar. Verifique a conexão e tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel-card flex flex-col gap-4">
      <div>
        <p className="text-sm text-muted">Aluno</p>
        <p className="font-semibold">{memberName}</p>
        <p className="mt-2 text-sm text-muted">Tema</p>
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
        {canReleaseToQueue ? (
          <button
            type="button"
            className="btn-secondary w-fit"
            disabled={pending || releasePending}
            onClick={onReleaseToQueue}
          >
            {releasePending ? "Devolvendo..." : "Devolver à fila"}
          </button>
        ) : null}
      </div>

      {hasRubric && evaluationRubric ? (
        <>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Descrição da correção (quesitos e notas)
            <CorrectionRubricPanel
              rubric={evaluationRubric}
              scores={rubricScores}
              onScoresChange={setRubricScores}
            />
          </label>
        </>
      ) : (
        <>
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
        </>
      )}

      <label className="flex flex-col gap-2 text-sm font-medium">
        Comentários técnicos do professor
        <textarea
          className="field-input min-h-28 resize-y py-3"
          value={errorsNotes}
          onChange={(event) => setErrorsNotes(event.target.value)}
          required
        />
      </label>

      <fieldset className="flex flex-col gap-3 rounded-xl border border-[color:var(--border-subtle)] p-4">
        <legend className="px-1 text-sm font-medium">Reenvio neste tema (após salvar)</legend>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="resubmitMode"
            className="mt-1"
            checked={resubmitMode === "none"}
            onChange={() => setResubmitMode("none")}
          />
          <span>
            <strong className="text-foreground">Não liberar reenvio</strong> — aluno só vê a
            correção.
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="resubmitMode"
            className="mt-1"
            checked={resubmitMode === "free"}
            onChange={() => setResubmitMode("free")}
          />
          <span>
            <strong className="text-foreground">Reenvio gratuito</strong> — aluno pode enviar de
            novo neste tema <strong className="text-foreground">sem</strong> gastar correção do
            plano.
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="resubmitMode"
            className="mt-1"
            checked={resubmitMode === "charged"}
            onChange={() => setResubmitMode("charged")}
          />
          <span>
            <strong className="text-foreground">Reenvio com consumo de cota</strong> — o próximo
            envio neste tema usa <strong className="text-foreground">1 correção</strong> do plano
            do aluno (ex.: de 4 passa a 3).
          </span>
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
