"use client";

import { FormEvent, useState } from "react";
import { updateEdital } from "@/app/actions/editais";
import { SubmissionPeriodPerCargoHints } from "@/components/editais/submission-period-per-cargo-hints";
import type { CargoEditInput, PhaseEditInput } from "@/lib/editais/types";

type InitialCargo = {
  id: string;
  name: string;
  vacancyCount: number;
  phases: {
    id: string;
    title: string;
    description: string;
  }[];
};

type Props = {
  editalId: string;
  initialTitle: string;
  initialSubmissionPeriodDays: number;
  initialCargos: InitialCargo[];
};

const emptyPhase = (): PhaseEditInput => ({
  title: "",
  description: "",
});

const emptyCargo = (): CargoEditInput => ({
  name: "",
  vacancyCount: 1,
  phases: [emptyPhase()],
});

function mapInitialCargos(cargos: InitialCargo[]): CargoEditInput[] {
  if (!cargos.length) return [emptyCargo()];
  return cargos.map((cargo) => ({
    id: cargo.id,
    name: cargo.name,
    vacancyCount: cargo.vacancyCount,
    phases: cargo.phases.length
      ? cargo.phases.map((phase) => ({
          id: phase.id,
          title: phase.title,
          description: phase.description,
        }))
      : [emptyPhase()],
  }));
}

export function EditEditalForm({
  editalId,
  initialTitle,
  initialSubmissionPeriodDays,
  initialCargos,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [submissionPeriodDays, setSubmissionPeriodDays] = useState(initialSubmissionPeriodDays);
  const [cargos, setCargos] = useState<CargoEditInput[]>(() => mapInitialCargos(initialCargos));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function updateCargo(index: number, cargo: CargoEditInput) {
    setCargos((current) => current.map((item, i) => (i === index ? cargo : item)));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);

    const result = await updateEdital({
      editalId,
      title,
      submissionPeriodDays,
      cargos,
    });
    if (!result.ok) {
      setError(result.message);
    } else {
      setMessage(result.message);
    }
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="panel-card flex flex-col gap-6">
      <div>
        <h2 className="panel-title">Editar edital</h2>
        <p className="mt-1 text-sm text-muted">
          Altere título, cargos e fases a qualquer momento. Remover cargo ou fase com envios ou
          inscrições não é permitido.
        </p>
      </div>

      <label className="flex flex-col gap-2 text-sm font-medium">
        Título do edital
        <input
          className="field-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          maxLength={180}
        />
      </label>

      <div className="flex max-w-2xl flex-col gap-2 text-sm font-medium">
        <label className="flex flex-col gap-2">
          Prazo para envio (dias)
          <input
            type="number"
            min={1}
            max={365}
            className="field-input max-w-xs"
            value={submissionPeriodDays}
            onChange={(event) => setSubmissionPeriodDays(Number(event.target.value))}
            required
          />
        </label>
        <p className="text-xs font-normal text-muted">
          Total por aluno. Atualiza a estimativa por cargo conforme você altera fases ou o número de
          dias.
        </p>
        <SubmissionPeriodPerCargoHints
          submissionPeriodDays={submissionPeriodDays}
          cargos={cargos.map((cargo) => ({
            name: cargo.name,
            phaseCount: cargo.phases.length,
          }))}
        />
      </div>

      {cargos.map((cargo, cargoIndex) => (
        <section
          key={cargo.id ?? `new-cargo-${cargoIndex}`}
          className="rounded-2xl border border-white/10 bg-black/20 p-4 flex flex-col gap-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-purple">Cargo {cargoIndex + 1}</h3>
            {cargos.length > 1 ? (
              <button
                type="button"
                className="text-sm text-red-300"
                onClick={() => setCargos((current) => current.filter((_, i) => i !== cargoIndex))}
              >
                Remover cargo
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2">
              Nome do cargo
              <input
                className="field-input"
                value={cargo.name}
                onChange={(event) =>
                  updateCargo(cargoIndex, { ...cargo, name: event.target.value })
                }
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Quantidade de vagas
              <input
                type="number"
                min={1}
                className="field-input"
                value={cargo.vacancyCount}
                onChange={(event) =>
                  updateCargo(cargoIndex, {
                    ...cargo,
                    vacancyCount: Number(event.target.value),
                  })
                }
                required
              />
            </label>
          </div>

          <div className="flex flex-col gap-4">
            {cargo.phases.map((phase, phaseIndex) => (
              <div
                key={phase.id ?? `new-phase-${cargoIndex}-${phaseIndex}`}
                className="rounded-xl border border-white/8 p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">Fase {phaseIndex + 1}</p>
                  {cargo.phases.length > 1 ? (
                    <button
                      type="button"
                      className="text-xs text-red-300"
                      onClick={() =>
                        updateCargo(cargoIndex, {
                          ...cargo,
                          phases: cargo.phases.filter((_, i) => i !== phaseIndex),
                        })
                      }
                    >
                      Remover fase
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
                        const phases = [...cargo.phases];
                        phases[phaseIndex] = { ...phase, title: event.target.value };
                        updateCargo(cargoIndex, { ...cargo, phases });
                      }}
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Descrição
                    <textarea
                      className="field-input min-h-24 resize-y py-3"
                      value={phase.description}
                      onChange={(event) => {
                        const phases = [...cargo.phases];
                        phases[phaseIndex] = { ...phase, description: event.target.value };
                        updateCargo(cargoIndex, { ...cargo, phases });
                      }}
                      required
                    />
                  </label>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="btn-secondary btn-sm w-fit"
              onClick={() =>
                updateCargo(cargoIndex, {
                  ...cargo,
                  phases: [...cargo.phases, emptyPhase()],
                })
              }
            >
              Adicionar fase
            </button>
          </div>
        </section>
      ))}

      <button
        type="button"
        className="btn-secondary w-fit"
        onClick={() => setCargos((current) => [...current, emptyCargo()])}
      >
        Adicionar cargo
      </button>

      {error ? <p className="alert-error">{error}</p> : null}
      {message ? <p className="alert-success">{message}</p> : null}

      <button type="submit" disabled={pending} className="btn-primary w-fit">
        {pending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}
