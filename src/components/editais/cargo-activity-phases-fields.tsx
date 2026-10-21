"use client";

import type { ActivityKind } from "@/lib/editais/activity-kind";
import { ACTIVITY_KIND_LABEL } from "@/lib/editais/activity-kind";
import { PhaseDescriptionEditor } from "@/components/editais/phase-description-editor";
import type { PhaseInput } from "@/lib/editais/types";

type PhaseRow = PhaseInput & { id?: string };

type Props = {
  activityKind: ActivityKind;
  phases: PhaseRow[];
  onChange: (phases: PhaseRow[]) => void;
};

const emptyPhase = (): PhaseRow => ({ title: "", description: "" });

export function CargoActivityPhasesFields({ activityKind, phases, onChange }: Props) {
  const label = ACTIVITY_KIND_LABEL[activityKind];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/15 p-4">
      <p className="text-sm font-semibold text-purple">{label}</p>
      {phases.map((phase, phaseIndex) => (
        <div
          key={phase.id ?? `phase-${activityKind}-${phaseIndex}`}
          className="rounded-xl border border-white/8 p-3"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Tema {phaseIndex + 1}</p>
            {phases.length > 1 ? (
              <button
                type="button"
                className="text-action-danger text-xs"
                onClick={() => onChange(phases.filter((_, i) => i !== phaseIndex))}
              >
                Remover tema
              </button>
            ) : null}
          </div>
          <div className="grid gap-3">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Título
              <input
                className="field-input"
                value={phase.title}
                onChange={(event) => {
                  const next = [...phases];
                  next[phaseIndex] = { ...phase, title: event.target.value };
                  onChange(next);
                }}
                required
              />
            </label>
            <div className="flex flex-col gap-2 text-sm font-medium">
              <span>Descrição</span>
              <PhaseDescriptionEditor
                key={phase.id ?? `phase-desc-${activityKind}-${phaseIndex}`}
                value={phase.description}
                onChange={(description) => {
                  const next = [...phases];
                  next[phaseIndex] = { ...phase, description };
                  onChange(next);
                }}
              />
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn-secondary btn-sm w-fit"
        onClick={() => onChange([...phases, emptyPhase()])}
      >
        Adicionar tema ({label})
      </button>
    </div>
  );
}
