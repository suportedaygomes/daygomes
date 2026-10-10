"use client";

import { FormEvent, useState } from "react";
import { createEdital } from "@/app/actions/editais";
import type { CargoInput, PhaseInput } from "@/lib/editais/types";

const emptyPhase = (): PhaseInput => ({
  title: "",
  description: "",
  deadlineAt: "",
});

const emptyCargo = (): CargoInput => ({
  name: "",
  vacancyCount: 1,
  phases: [emptyPhase()],
});

export function CreateEditalForm() {
  const [title, setTitle] = useState("");
  const [cargos, setCargos] = useState<CargoInput[]>([emptyCargo()]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function updateCargo(index: number, cargo: CargoInput) {
    setCargos((current) => current.map((item, i) => (i === index ? cargo : item)));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);

    const result = await createEdital({ title, cargos });
    if (!result.ok) {
      setError(result.message);
      setPending(false);
      return;
    }

    setMessage(result.message);
    setTitle("");
    setCargos([emptyCargo()]);
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8">
      <label className="flex flex-col gap-2 text-sm font-medium">
        Título do edital
        <input
          className="field-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="SESP Prova 29/12/2026"
          required
          maxLength={180}
        />
      </label>

      {cargos.map((cargo, cargoIndex) => (
        <section key={cargoIndex} className="panel-card flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="panel-title">Cargo {cargoIndex + 1}</h3>
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
                placeholder="AGRICULTOR"
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
                key={phaseIndex}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-purple">Fase {phaseIndex + 1}</p>
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
                      placeholder="1ª redação sobre covid-19"
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
                      placeholder="Orientações para o aluno montar a redação..."
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Prazo final
                    <input
                      type="datetime-local"
                      className="field-input"
                      value={phase.deadlineAt}
                      onChange={(event) => {
                        const phases = [...cargo.phases];
                        phases[phaseIndex] = { ...phase, deadlineAt: event.target.value };
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
              className="btn-secondary w-fit"
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
        {pending ? "Salvando..." : "Criar edital"}
      </button>
    </form>
  );
}
