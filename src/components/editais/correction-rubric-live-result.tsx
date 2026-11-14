"use client";

import { useMemo } from "react";
import type { EditalEvaluationRubric, RubricScores } from "@/lib/editais/evaluation-rubric";
import { getRubricLivePreview, type RubricLivePreview } from "@/lib/editais/evaluation-rubric";

type Props = {
  rubric: EditalEvaluationRubric;
  scores: RubricScores;
};

export function CorrectionRubricLiveResult({ rubric, scores }: Props) {
  const preview = useMemo(() => getRubricLivePreview(rubric, scores), [rubric, scores]);

  return (
    <section
      className="rounded-xl border border-white/15 bg-black/20 p-4"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="text-sm font-semibold text-foreground">Prévia da correção (antes de salvar)</p>
      <p className="mt-1 font-mono text-xs text-muted">{rubric.formula}</p>
      <div className="mt-3">
        <PreviewBody preview={preview} rubric={rubric} />
      </div>
    </section>
  );
}

function PreviewBody({
  preview,
  rubric,
}: {
  preview: RubricLivePreview;
  rubric: EditalEvaluationRubric;
}) {
  if (preview.status === "incomplete") {
    return (
      <div className="flex flex-col gap-2 text-sm text-foreground">
        <p>
          Nota final: <span className="font-semibold">—</span>{" "}
          <span className="text-muted">
            ({preview.filledCount} de {preview.totalCount} quesitos preenchidos)
          </span>
        </p>
        {preview.missingTitles.length ? (
          <p className="text-sm text-muted">Falta nota em: {preview.missingTitles.join(" · ")}</p>
        ) : null}
      </div>
    );
  }

  if (preview.status === "invalid") {
    return (
      <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-foreground">
        {preview.message}
      </p>
    );
  }

  return <ReadyBlock preview={preview} rubric={rubric} />;
}

function ReadyBlock({
  preview,
  rubric,
}: {
  preview: Extract<RubricLivePreview, { status: "ready" }>;
  rubric: EditalEvaluationRubric;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground">
        Nota final (0 a 1000):{" "}
        <span className="text-2xl font-bold tabular-nums text-purple">
          {preview.finalGrade.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
        </span>
      </p>

      {preview.approval === "approved" ? (
        <p className="inline-flex w-fit items-center rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-100">
          Aluno aprovado
        </p>
      ) : preview.approval === "failed" ? (
        <p className="inline-flex w-fit items-center rounded-full border border-red-400/40 bg-red-500/15 px-3 py-1 text-sm font-semibold text-red-100">
          Aluno reprovado
        </p>
      ) : null}

      {rubric.minApprovalScore != null ? (
        <p className="text-sm text-muted">
          Mínimo para aprovação:{" "}
          <span className="font-medium text-foreground">
            {rubric.minApprovalScore.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
          </span>
          {rubric.approvalNote ? ` — ${rubric.approvalNote}` : ""}
        </p>
      ) : rubric.approvalNote ? (
        <p className="text-sm text-muted">{rubric.approvalNote}</p>
      ) : null}
    </div>
  );
}