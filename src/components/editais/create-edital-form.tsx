"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createEdital } from "@/app/actions/editais";
import { EvaluationRubricEditor } from "@/components/editais/evaluation-rubric-editor";
import { SubmissionPeriodPerCargoHints } from "@/components/editais/submission-period-per-cargo-hints";
import { emptyEvaluationRubric } from "@/lib/editais/evaluation-rubric";
import type { EditalEvaluationRubric } from "@/lib/editais/evaluation-rubric";
import { DEFAULT_SUBMISSION_PERIOD_DAYS } from "@/lib/editais/member-phase-deadline";
import { CargoActivityPhasesFields } from "@/components/editais/cargo-activity-phases-fields";
import { CorrectionQuotaSelect } from "@/components/editais/correction-quota-select";
import type { CargoInput, PhaseInput } from "@/lib/editais/types";

type AttachmentDraft = {
  file: File;
  title: string;
  description: string;
};

const emptyPhase = (): PhaseInput => ({
  title: "",
  description: "",
});

const emptyCargo = (): CargoInput => ({
  name: "",
  offersDissertativa: true,
  offersEstudoCaso: false,
  phasesDissertativa: [emptyPhase()],
  phasesEstudoCaso: [],
});

export function CreateEditalForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [submissionPeriodDays, setSubmissionPeriodDays] = useState(
    DEFAULT_SUBMISSION_PERIOD_DAYS,
  );
  const [defaultCorrectionQuota, setDefaultCorrectionQuota] = useState(4);
  const [cargos, setCargos] = useState<CargoInput[]>([emptyCargo()]);
  const [attachmentDrafts, setAttachmentDrafts] = useState<AttachmentDraft[]>([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [evaluationRubric, setEvaluationRubric] = useState<EditalEvaluationRubric>(
    emptyEvaluationRubric(),
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function updateCargo(index: number, cargo: CargoInput) {
    setCargos((current) => current.map((item, i) => (i === index ? cargo : item)));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const result = await createEdital({
      title,
      submissionPeriodDays,
      defaultCorrectionQuota,
      cargos,
      evaluationRubric,
    });
    if (!result.ok || !result.editalId) {
      setError(result.ok ? "Edital criado, mas o ID não foi retornado." : result.message);
      setPending(false);
      return;
    }

    for (const draft of attachmentDrafts) {
      const form = new FormData();
      form.append("file", draft.file);
      form.append("title", draft.title);
      form.append("description", draft.description);
      const upload = await fetch(`/api/editais/${result.editalId}/attachments`, {
        method: "POST",
        body: form,
      });
      if (!upload.ok) {
        const payload = (await upload.json().catch(() => null)) as { error?: string } | null;
        setError(
          payload?.error ??
            `Edital criado, mas falhou ao enviar o anexo "${draft.title}". Você pode adicionar na página do edital.`,
        );
        setPending(false);
        router.push(`/painel/admin/editais/${result.editalId}`);
        return;
      }
    }

    router.push(`/painel/admin/editais/${result.editalId}`);
  }

  function addAttachmentDraft() {
    if (!draftFile) {
      setError("Selecione um arquivo para o anexo.");
      return;
    }
    const trimmedTitle = draftTitle.trim();
    if (trimmedTitle.length < 2) {
      setError("Informe o título do anexo.");
      return;
    }
    setError("");
    setAttachmentDrafts((current) => [
      ...current,
      {
        file: draftFile,
        title: trimmedTitle,
        description: draftDescription.trim(),
      },
    ]);
    setDraftTitle("");
    setDraftDescription("");
    setDraftFile(null);
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
          Total por aluno após compra ou vínculo. O valor abaixo é dividido entre os temas de cada
          cargo quando o tema é liberado.
        </p>
        <SubmissionPeriodPerCargoHints
          submissionPeriodDays={submissionPeriodDays}
          cargos={cargos.map((cargo) => ({
            name: cargo.name,
            phaseCount:
              (cargo.offersDissertativa ? cargo.phasesDissertativa.length : 0) +
              (cargo.offersEstudoCaso ? cargo.phasesEstudoCaso.length : 0),
          }))}
        />
      </div>

      <CorrectionQuotaSelect
        variant="edital-default"
        value={defaultCorrectionQuota}
        onChange={setDefaultCorrectionQuota}
        id="create-edital-default-quota"
      />

      {cargos.map((cargo, cargoIndex) => (
        <section key={cargoIndex} className="panel-card flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="panel-title">Cargo {cargoIndex + 1}</h3>
            {cargos.length > 1 ? (
              <button
                type="button"
                className="text-action-danger text-sm"
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
            <div className="flex flex-col gap-2 text-sm font-medium sm:col-span-2">
              <span>Modalidades deste cargo</span>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 font-normal">
                  <input
                    type="checkbox"
                    checked={cargo.offersDissertativa}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      updateCargo(cargoIndex, {
                        ...cargo,
                        offersDissertativa: checked,
                        phasesDissertativa:
                          checked && !cargo.phasesDissertativa.length
                            ? [emptyPhase()]
                            : cargo.phasesDissertativa,
                      });
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
                      updateCargo(cargoIndex, {
                        ...cargo,
                        offersEstudoCaso: checked,
                        phasesEstudoCaso:
                          checked && !cargo.phasesEstudoCaso.length
                            ? [emptyPhase()]
                            : cargo.phasesEstudoCaso,
                      });
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
              phases={cargo.phasesDissertativa}
              onChange={(phases) =>
                updateCargo(cargoIndex, { ...cargo, phasesDissertativa: phases })
              }
            />
          ) : null}
          {cargo.offersEstudoCaso ? (
            <CargoActivityPhasesFields
              activityKind="estudo_caso"
              phases={cargo.phasesEstudoCaso}
              onChange={(phases) =>
                updateCargo(cargoIndex, { ...cargo, phasesEstudoCaso: phases })
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

      <section className="panel-card flex flex-col gap-4">
        <div>
          <h3 className="panel-title">Quesitos avaliativos (opcional)</h3>
          <p className="mt-1 text-sm text-muted">
            Se configurar aqui, o corretor preenche as notas por quesito e a nota final (0 a 1000) é
            calculada pela fórmula. Você pode ajustar depois na página do edital.
          </p>
        </div>
        <EvaluationRubricEditor value={evaluationRubric} onChange={setEvaluationRubric} />
      </section>

      <section className="panel-card flex flex-col gap-4">
        <div>
          <h3 className="panel-title">Anexos (opcional)</h3>
          <p className="mt-1 text-sm text-muted">
            Materiais do edital para membros e corretores baixarem. Qualquer formato, até 25 MB.
          </p>
        </div>
        <div className="grid gap-3 rounded-xl border border-white/10 p-4">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Título do anexo
            <input
              className="field-input"
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              maxLength={160}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Descrição
            <textarea
              className="field-input min-h-20 resize-y py-3"
              value={draftDescription}
              onChange={(event) => setDraftDescription(event.target.value)}
              maxLength={2000}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Arquivo
            <input
              type="file"
              className="field-input py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-purple/20 file:px-3 file:py-1.5 file:text-sm file:font-medium"
              onChange={(event) => setDraftFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <button type="button" className="btn-secondary btn-sm w-fit" onClick={addAttachmentDraft}>
            Incluir na lista
          </button>
        </div>
        {attachmentDrafts.length ? (
          <ul className="flex flex-col gap-2 text-sm">
            {attachmentDrafts.map((draft, index) => (
              <li
                key={`${draft.title}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2"
              >
                <span>
                  <strong>{draft.title}</strong> · {draft.file.name}
                </span>
                <button
                  type="button"
                  className="text-action-danger text-xs"
                  onClick={() =>
                    setAttachmentDrafts((current) => current.filter((_, i) => i !== index))
                  }
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {error ? <p className="alert-error">{error}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary w-fit">
        {pending ? "Salvando..." : "Criar edital"}
      </button>
    </form>
  );
}
