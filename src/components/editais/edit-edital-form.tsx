"use client";

import { FormEvent, useState } from "react";
import { updateEdital } from "@/app/actions/editais";
import { CargoActivityPhasesFields } from "@/components/editais/cargo-activity-phases-fields";
import { CorrectionQuotaSelect } from "@/components/editais/correction-quota-select";
import { SubmissionPeriodPerCargoHints } from "@/components/editais/submission-period-per-cargo-hints";
import type { ActivityKind } from "@/lib/editais/activity-kind";
import type { CargoEditInput, PhaseEditInput } from "@/lib/editais/types";

type InitialCargo = {
  id: string;
  name: string;
  offersDissertativa: boolean;
  offersEstudoCaso: boolean;
  phases: {
    id: string;
    activityKind: ActivityKind;
    title: string;
    description: string;
  }[];
};

type Props = {
  editalId: string;
  initialTitle: string;
  initialSubmissionPeriodDays: number;
  initialDefaultCorrectionQuota: number;
  initialCargos: InitialCargo[];
};

const emptyPhase = (activityKind: ActivityKind): PhaseEditInput => ({
  activityKind,
  title: "",
  description: "",
});

const emptyCargo = (): CargoEditInput => ({
  name: "",
  offersDissertativa: true,
  offersEstudoCaso: false,
  phases: [emptyPhase("dissertativa")],
});

function mapInitialCargos(cargos: InitialCargo[]): CargoEditInput[] {
  if (!cargos.length) return [emptyCargo()];
  return cargos.map((cargo) => ({
    id: cargo.id,
    name: cargo.name,
    offersDissertativa: cargo.offersDissertativa,
    offersEstudoCaso: cargo.offersEstudoCaso,
    phases: cargo.phases.length
      ? cargo.phases.map((phase) => ({
          id: phase.id,
          activityKind: phase.activityKind,
          title: phase.title,
          description: phase.description,
        }))
      : [emptyPhase("dissertativa")],
  }));
}

function phasesForKind(cargo: CargoEditInput, kind: ActivityKind) {
  return cargo.phases.filter((p) => p.activityKind === kind);
}

function setPhasesForKind(
  cargo: CargoEditInput,
  kind: ActivityKind,
  nextKindPhases: PhaseEditInput[],
): CargoEditInput {
  const other = cargo.phases.filter((p) => p.activityKind !== kind);
  return { ...cargo, phases: [...other, ...nextKindPhases.map((p) => ({ ...p, activityKind: kind }))] };
}

export function EditEditalForm({
  editalId,
  initialTitle,
  initialSubmissionPeriodDays,
  initialDefaultCorrectionQuota,
  initialCargos,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [submissionPeriodDays, setSubmissionPeriodDays] = useState(initialSubmissionPeriodDays);
  const [defaultCorrectionQuota, setDefaultCorrectionQuota] = useState(
    initialDefaultCorrectionQuota,
  );
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
    try {
      const result = await updateEdital({
        editalId,
        title,
        submissionPeriodDays,
        defaultCorrectionQuota,
        cargos,
      });
      if (!result.ok) {
        setError(result.message);
      } else {
        setMessage(result.message);
      }
    } catch {
      setError(
        "Não foi possível salvar. Se o edital é grande, aguarde um pouco e tente de novo — ou recarregue a página.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel-card flex flex-col gap-6">
      <div>
        <h2 className="panel-title">Editar edital</h2>
        <p className="mt-1 text-sm text-muted">
          Altere título, cargos e fases a qualquer momento. Remover cargo ou fase com envios não é
          permitido.
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

      <CorrectionQuotaSelect
        variant="edital-default"
        value={defaultCorrectionQuota}
        onChange={setDefaultCorrectionQuota}
        id="edit-edital-default-quota"
      />

      {cargos.map((cargo, cargoIndex) => (
        <section
          key={cargo.id ?? `new-cargo-${cargoIndex}`}
          className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
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
            <div className="flex flex-col gap-2 text-sm font-medium sm:col-span-2">
              <span>Modalidades deste cargo</span>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 font-normal">
                  <input
                    type="checkbox"
                    checked={cargo.offersDissertativa}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      let next = { ...cargo, offersDissertativa: checked };
                      if (checked && !phasesForKind(cargo, "dissertativa").length) {
                        next = setPhasesForKind(next, "dissertativa", [emptyPhase("dissertativa")]);
                      }
                      if (!checked) {
                        next = setPhasesForKind(next, "dissertativa", []);
                      }
                      updateCargo(cargoIndex, next);
                    }}
                  />
                  Redação dissertativa
                </label>
                <label className="flex items-center gap-2 font-normal">
                  <input
                    type="checkbox"
                    checked={cargo.offersEstudoCaso}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      let next = { ...cargo, offersEstudoCaso: checked };
                      if (checked && !phasesForKind(cargo, "estudo_caso").length) {
                        next = setPhasesForKind(next, "estudo_caso", [emptyPhase("estudo_caso")]);
                      }
                      if (!checked) {
                        next = setPhasesForKind(next, "estudo_caso", []);
                      }
                      updateCargo(cargoIndex, next);
                    }}
                  />
                  Estudo de caso
                </label>
              </div>
            </div>
          </div>

          {cargo.offersDissertativa ? (
            <CargoActivityPhasesFields
              activityKind="dissertativa"
              phases={phasesForKind(cargo, "dissertativa")}
              onChange={(phases) =>
                updateCargo(
                  cargoIndex,
                  setPhasesForKind(
                    cargo,
                    "dissertativa",
                    phases.map((p) => ({ ...p, activityKind: "dissertativa" })),
                  ),
                )
              }
            />
          ) : null}
          {cargo.offersEstudoCaso ? (
            <CargoActivityPhasesFields
              activityKind="estudo_caso"
              phases={phasesForKind(cargo, "estudo_caso")}
              onChange={(phases) =>
                updateCargo(
                  cargoIndex,
                  setPhasesForKind(
                    cargo,
                    "estudo_caso",
                    phases.map((p) => ({ ...p, activityKind: "estudo_caso" })),
                  ),
                )
              }
            />
          ) : null}
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
