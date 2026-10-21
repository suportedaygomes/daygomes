"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CargoActivityPhasesFields } from "@/components/editais/cargo-activity-phases-fields";
import { CorrectionQuotaSelect } from "@/components/editais/correction-quota-select";
import { EditalDraftStatusBanner } from "@/components/editais/edital-draft-status-banner";
import { SubmissionPeriodPerCargoHints } from "@/components/editais/submission-period-per-cargo-hints";
import {
  clearEditalAdminDraftSectionClient,
  migrateLocalEditalDraftToServer,
  useEditalAdminDraftSync,
} from "@/hooks/use-edital-admin-draft-sync";
import type { ActivityKind } from "@/lib/editais/activity-kind";
import type { EditalAdminDraftView } from "@/lib/editais/edital-admin-draft";
import {
  hasEditalEditDraftChanges,
  type EditalEditFormSnapshot,
} from "@/lib/editais/edital-edit-draft";
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
  publishedRevision: string;
  adminDraft: EditalAdminDraftView | null;
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

function buildPublishedSnapshot(
  title: string,
  submissionPeriodDays: number,
  defaultCorrectionQuota: number,
  initialCargos: InitialCargo[],
): EditalEditFormSnapshot {
  return {
    title,
    submissionPeriodDays,
    defaultCorrectionQuota,
    cargos: mapInitialCargos(initialCargos),
  };
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

function applySnapshot(snapshot: EditalEditFormSnapshot) {
  return {
    title: snapshot.title,
    submissionPeriodDays: snapshot.submissionPeriodDays,
    defaultCorrectionQuota: snapshot.defaultCorrectionQuota,
    cargos: snapshot.cargos,
  };
}

export function EditEditalForm({
  editalId,
  publishedRevision,
  adminDraft,
  initialTitle,
  initialSubmissionPeriodDays,
  initialDefaultCorrectionQuota,
  initialCargos,
}: Props) {
  const router = useRouter();
  const published = useMemo(
    () =>
      buildPublishedSnapshot(
        initialTitle,
        initialSubmissionPeriodDays,
        initialDefaultCorrectionQuota,
        initialCargos,
      ),
    [
      initialTitle,
      initialSubmissionPeriodDays,
      initialDefaultCorrectionQuota,
      initialCargos,
    ],
  );

  const [title, setTitle] = useState(published.title);
  const [submissionPeriodDays, setSubmissionPeriodDays] = useState(published.submissionPeriodDays);
  const [defaultCorrectionQuota, setDefaultCorrectionQuota] = useState(
    published.defaultCorrectionQuota,
  );
  const [cargos, setCargos] = useState<CargoEditInput[]>(published.cargos);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(adminDraft?.updatedAt ?? null);
  const draftRevisionMismatch =
    Boolean(adminDraft?.structure) &&
    adminDraft?.publishedRevision !== publishedRevision;
  const hydratedRef = useRef(false);
  const lastSeenRevisionRef = useRef(publishedRevision);

  const currentSnapshot = useMemo(
    (): EditalEditFormSnapshot => ({
      title,
      submissionPeriodDays,
      defaultCorrectionQuota,
      cargos,
    }),
    [title, submissionPeriodDays, defaultCorrectionQuota, cargos],
  );

  const hasUnpublishedChanges = hasEditalEditDraftChanges(published, currentSnapshot);

  const resetToPublished = useCallback(() => {
    setTitle(published.title);
    setSubmissionPeriodDays(published.submissionPeriodDays);
    setDefaultCorrectionQuota(published.defaultCorrectionQuota);
    setCargos(published.cargos);
    setDraftSavedAt(null);
    setError("");
    setMessage("");
    void clearEditalAdminDraftSectionClient(editalId, "structure");
  }, [editalId, published]);

  const draftPatch = useMemo(
    () => ({ structure: hasUnpublishedChanges ? currentSnapshot : null }),
    [currentSnapshot, hasUnpublishedChanges],
  );

  useEditalAdminDraftSync({
    editalId,
    publishedRevision,
    enabled: hasUnpublishedChanges,
    patch: draftPatch,
  });

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    void migrateLocalEditalDraftToServer(editalId, publishedRevision);

    const structure = adminDraft?.structure;
    if (!structure || !hasEditalEditDraftChanges(published, structure)) return;

    const applied = applySnapshot(structure);
    setTitle(applied.title);
    setSubmissionPeriodDays(applied.submissionPeriodDays);
    setDefaultCorrectionQuota(applied.defaultCorrectionQuota);
    setCargos(applied.cargos);
    setDraftSavedAt(adminDraft?.updatedAt ?? null);
  }, [adminDraft?.structure, adminDraft?.updatedAt, editalId, published, publishedRevision]);

  useEffect(() => {
    if (lastSeenRevisionRef.current === publishedRevision) return;
    lastSeenRevisionRef.current = publishedRevision;

    if (draftRevisionMismatch) return;

    const applied = applySnapshot(published);
    setTitle(applied.title);
    setSubmissionPeriodDays(applied.submissionPeriodDays);
    setDefaultCorrectionQuota(applied.defaultCorrectionQuota);
    setCargos(applied.cargos);
  }, [draftRevisionMismatch, published, publishedRevision]);

  useEffect(() => {
    if (!hasUnpublishedChanges) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnpublishedChanges]);

  function updateCargo(index: number, cargo: CargoEditInput) {
    setCargos((current) => current.map((item, i) => (i === index ? cargo : item)));
  }

  function discardDraft() {
    const ok = window.confirm(
      "Descartar o rascunho e voltar à versão publicada? As alterações não salvas serão perdidas.",
    );
    if (!ok) return;
    resetToPublished();
    setMessage("Rascunho descartado. Você está vendo a versão publicada.");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);
    try {
      const response = await fetch(`/api/admin/editais/${editalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          submissionPeriodDays,
          defaultCorrectionQuota,
          cargos,
        }),
      });

      const raw = await response.text();
      let result: { ok?: boolean; message?: string } | null = null;
      try {
        result = raw ? (JSON.parse(raw) as { ok?: boolean; message?: string }) : null;
      } catch {
        result = null;
      }

      if (!response.ok || !result?.ok) {
        const fallback =
          response.status === 413
            ? "O edital é grande demais para enviar de uma vez. Reduza textos longos nos temas."
            : raw && raw.length < 200 && !raw.startsWith("{")
              ? raw
              : "Não foi possível salvar o edital.";
        setError(result?.message ?? fallback);
        return;
      }

      setDraftSavedAt(null);
      setMessage(result.message ?? "Alterações publicadas. Membros já veem esta versão.");
      router.refresh();
    } catch {
      setError(
        "Não foi possível concluir o salvamento. Verifique a conexão e tente de novo.",
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
          Membros só veem alterações depois de <strong className="font-medium text-foreground">Salvar e publicar</strong>.
          O rascunho é salvo automaticamente no servidor (outro dispositivo continua de onde parou).
        </p>
      </div>

      {hasUnpublishedChanges ? (
        <EditalDraftStatusBanner
          draftUpdatedAt={draftSavedAt}
          publishedRevisionMismatch={draftRevisionMismatch}
        />
      ) : (
        <p role="status" className="text-sm text-muted">
          Nenhuma alteração pendente — alunos veem a versão publicada atual.
        </p>
      )}

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
          Total por aluno. Atualiza a estimativa por cargo conforme você altera temas ou o número de
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

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || !hasUnpublishedChanges} className="btn-primary">
          {pending ? "Publicando..." : "Salvar e publicar"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={pending || !hasUnpublishedChanges}
          onClick={discardDraft}
        >
          Cancelar alterações
        </button>
      </div>
    </form>
  );
}
