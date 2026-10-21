"use client";

import type {
  EditalEvaluationRubric,
  RubricCriterion,
  RubricQuesito,
} from "@/lib/editais/evaluation-rubric";
import { defaultSampleRubric } from "@/lib/editais/evaluation-rubric";

type Props = {
  value: EditalEvaluationRubric;
  onChange: (next: EditalEvaluationRubric) => void;
};

function emptyQuesito(): RubricQuesito {
  return {
    code: "",
    title: "",
    minScore: 0,
    maxScore: 3,
    criteria: [{ label: "a", points: 0, description: "" }],
  };
}

function emptyCriterion(): RubricCriterion {
  return { label: "", points: 0, description: "" };
}

export function EvaluationRubricEditor({ value, onChange }: Props) {
  function updateQuesito(index: number, quesito: RubricQuesito) {
    const quesitos = [...value.quesitos];
    quesitos[index] = quesito;
    onChange({ ...value, quesitos });
  }

  function updateCriterion(quesitoIndex: number, critIndex: number, criterion: RubricCriterion) {
    const quesito = value.quesitos[quesitoIndex];
    const criteria = [...quesito.criteria];
    criteria[critIndex] = criterion;
    updateQuesito(quesitoIndex, { ...quesito, criteria });
  }

  const codesHint = value.quesitos
    .map((q) => q.code.trim().toUpperCase())
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Defina os quesitos, critérios de pontuação e a fórmula do passo 4. O corretor preenche a
          nota de cada quesito; a nota final (0 a 1000) é calculada automaticamente.
        </p>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => onChange(defaultSampleRubric())}
        >
          Carregar exemplo (CAC / OT / DLP)
        </button>
      </div>

      {value.quesitos.map((quesito, quesitoIndex) => (
        <div
          key={quesitoIndex}
          className="rounded-2xl border border-white/10 bg-black/20 p-4 flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-purple">Quesito {quesitoIndex + 1}</p>
            <button
              type="button"
              className="text-action-danger text-xs"
              onClick={() =>
                onChange({
                  ...value,
                  quesitos: value.quesitos.filter((_, i) => i !== quesitoIndex),
                })
              }
            >
              Remover quesito
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Código (na fórmula)
              <input
                className="field-input uppercase"
                value={quesito.code}
                onChange={(event) =>
                  updateQuesito(quesitoIndex, {
                    ...quesito,
                    code: event.target.value.toUpperCase(),
                  })
                }
                placeholder="CAC"
                maxLength={16}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2">
              Título do quesito
              <input
                className="field-input"
                value={quesito.title}
                onChange={(event) =>
                  updateQuesito(quesitoIndex, { ...quesito, title: event.target.value })
                }
                placeholder="Conteúdo e Atendimento ao Comando (CAC)"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Faixa mínima
              <input
                type="number"
                step="any"
                className="field-input"
                value={quesito.minScore}
                onChange={(event) =>
                  updateQuesito(quesitoIndex, {
                    ...quesito,
                    minScore: Number(event.target.value),
                  })
                }
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Faixa máxima
              <input
                type="number"
                step="any"
                className="field-input"
                value={quesito.maxScore}
                onChange={(event) =>
                  updateQuesito(quesitoIndex, {
                    ...quesito,
                    maxScore: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Critérios (parâmetros de pontuação)</p>
            {quesito.criteria.map((criterion, critIndex) => (
              <div
                key={critIndex}
                className="grid gap-2 rounded-xl border border-white/8 p-3 sm:grid-cols-[4rem_6rem_1fr_auto]"
              >
                <label className="flex flex-col gap-1 text-xs font-medium">
                  Item
                  <input
                    className="field-input"
                    value={criterion.label}
                    onChange={(event) =>
                      updateCriterion(quesitoIndex, critIndex, {
                        ...criterion,
                        label: event.target.value,
                      })
                    }
                    placeholder="a"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium">
                  Pontos
                  <input
                    type="number"
                    step="any"
                    className="field-input"
                    value={criterion.points}
                    onChange={(event) =>
                      updateCriterion(quesitoIndex, critIndex, {
                        ...criterion,
                        points: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium sm:col-span-1">
                  Descrição
                  <textarea
                    className="field-input min-h-16 resize-y py-2 text-sm"
                    value={criterion.description}
                    onChange={(event) =>
                      updateCriterion(quesitoIndex, critIndex, {
                        ...criterion,
                        description: event.target.value,
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="text-action-danger self-start text-xs sm:self-center"
                  onClick={() =>
                    updateQuesito(quesitoIndex, {
                      ...quesito,
                      criteria: quesito.criteria.filter((_, i) => i !== critIndex),
                    })
                  }
                >
                  Remover
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-secondary btn-sm w-fit"
              onClick={() =>
                updateQuesito(quesitoIndex, {
                  ...quesito,
                  criteria: [...quesito.criteria, emptyCriterion()],
                })
              }
            >
              Adicionar critério
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="btn-secondary w-fit"
        onClick={() => onChange({ ...value, quesitos: [...value.quesitos, emptyQuesito()] })}
      >
        Adicionar quesito
      </button>

      <div className="grid gap-4 rounded-2xl border border-white/10 p-4">
        <h4 className="text-sm font-semibold">Passo 4 — Resultado</h4>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Fórmula da nota final
          <input
            className="field-input font-mono text-sm"
            value={value.formula}
            onChange={(event) => onChange({ ...value, formula: event.target.value })}
            placeholder="[(CAC * 7) + (OT * 1.5) + (DLP * 1.5)] / 0.3"
          />
          {codesHint ? (
            <span className="text-xs text-muted">
              Códigos disponíveis: {codesHint}. Use * e / (ou × e ÷); vírgula decimal é aceita.
            </span>
          ) : null}
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Nota mínima para aprovação (opcional)
          <input
            type="number"
            step="any"
            className="field-input"
            value={value.minApprovalScore ?? ""}
            onChange={(event) => {
              const raw = event.target.value.trim();
              onChange({
                ...value,
                minApprovalScore: raw === "" ? null : Number(raw),
              });
            }}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Observação sobre aprovação (opcional)
          <textarea
            className="field-input min-h-20 resize-y py-3"
            value={value.approvalNote}
            onChange={(event) => onChange({ ...value, approvalNote: event.target.value })}
            placeholder="O candidato será considerado aprovado se..."
          />
        </label>
      </div>
    </div>
  );
}
