"use client";

import type { EditalEvaluationRubric, RubricScores } from "@/lib/editais/evaluation-rubric";
import { CorrectionRubricLiveResult } from "@/components/editais/correction-rubric-live-result";

type Props = {
  rubric: EditalEvaluationRubric;
  scores: RubricScores;
  onScoresChange: (next: RubricScores) => void;
};

function formatRange(min: number, max: number) {
  return `${min.toLocaleString("pt-BR")} a ${max.toLocaleString("pt-BR")}`;
}

export function CorrectionRubricPanel({ rubric, scores, onScoresChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium">Quesitos avaliativos</p>
      <div className="overflow-x-auto rounded-xl border border-[color:var(--border-subtle)]">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border-subtle)] bg-black/20 text-left">
              <th className="p-3 font-semibold">Quesito</th>
              <th className="w-32 p-3 font-semibold">Faixa de valor</th>
              <th className="w-28 p-3 font-semibold">Nota</th>
            </tr>
          </thead>
          <tbody>
            {rubric.quesitos.map((quesito) => (
              <tr
                key={quesito.code}
                className="border-b border-[color:var(--border-subtle)] align-top"
              >
                <td className="p-3">
                  <p className="font-medium">{quesito.title}</p>
                  <p className="mt-1 text-xs text-muted">({quesito.code})</p>
                  <ul className="mt-3 flex flex-col gap-1.5 text-xs text-muted">
                    {quesito.criteria.map((c) => (
                      <li key={`${quesito.code}-${c.label}`}>
                        <span className="font-medium text-foreground">{c.label})</span>{" "}
                        {c.points.toLocaleString("pt-BR")} — {c.description}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="p-3 text-muted">
                  {formatRange(quesito.minScore, quesito.maxScore)}
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    step="any"
                    min={quesito.minScore}
                    max={quesito.maxScore}
                    className="field-input w-full"
                    value={scores[quesito.code] ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value;
                      const next = { ...scores };
                      if (raw === "") {
                        delete next[quesito.code];
                      } else {
                        next[quesito.code] = Number(raw.replace(",", "."));
                      }
                      onScoresChange(next);
                    }}
                    required
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CorrectionRubricLiveResult rubric={rubric} scores={scores} />
    </div>
  );
}