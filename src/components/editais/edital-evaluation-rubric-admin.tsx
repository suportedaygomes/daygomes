"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EvaluationRubricEditor } from "@/components/editais/evaluation-rubric-editor";
import { EditalDraftStatusBanner } from "@/components/editais/edital-draft-status-banner";
import {
  clearEditalAdminDraftSectionClient,
  useEditalAdminDraftSync,
} from "@/hooks/use-edital-admin-draft-sync";
import type { EditalAdminDraftView } from "@/lib/editais/edital-admin-draft";
import { rubricsEqual } from "@/lib/editais/edital-admin-draft";
import type { EditalEvaluationRubric } from "@/lib/editais/evaluation-rubric";
import { emptyEvaluationRubric } from "@/lib/editais/evaluation-rubric";

type Props = {
  editalId: string;
  publishedRevision: string;
  adminDraft: EditalAdminDraftView | null;
  initialRubric: EditalEvaluationRubric | null;
};

export function EditalEvaluationRubricAdmin({
  editalId,
  publishedRevision,
  adminDraft,
  initialRubric,
}: Props) {
  const router = useRouter();
  const published = useMemo(
    () => initialRubric ?? emptyEvaluationRubric(),
    [initialRubric],
  );

  const hydratedRef = useRef(false);
  const [rubric, setRubric] = useState<EditalEvaluationRubric>(published);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(
    adminDraft?.evaluationRubric ? adminDraft.updatedAt : null,
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const hasUnpublishedChanges = !rubricsEqual(published, rubric);
  const draftRevisionMismatch =
    Boolean(adminDraft?.evaluationRubric) &&
    adminDraft?.publishedRevision !== publishedRevision;

  const draftPatch = useMemo(
    () => ({ evaluationRubric: hasUnpublishedChanges ? rubric : null }),
    [hasUnpublishedChanges, rubric],
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

    const draftRubric = adminDraft?.evaluationRubric;
    if (draftRubric && !rubricsEqual(published, draftRubric)) {
      setRubric(draftRubric);
      setDraftSavedAt(adminDraft?.updatedAt ?? null);
    }
  }, [adminDraft?.evaluationRubric, adminDraft?.updatedAt, published]);

  const resetToPublished = useCallback(() => {
    setRubric(published);
    setDraftSavedAt(null);
    setError("");
    setMessage("");
    void clearEditalAdminDraftSectionClient(editalId, "evaluationRubric");
  }, [editalId, published]);

  function discardDraft() {
    const ok = window.confirm(
      "Descartar o rascunho dos quesitos e voltar à versão publicada?",
    );
    if (!ok) return;
    resetToPublished();
    setMessage("Rascunho dos quesitos descartado.");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);

    try {
      const response = await fetch(`/api/admin/editais/${editalId}/evaluation-rubric`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rubric }),
      });

      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
      } | null;
      if (!response.ok || !result?.ok) {
        setError(result?.message ?? "Não foi possível salvar os quesitos.");
        return;
      }
      setDraftSavedAt(null);
      setMessage(result.message ?? "Quesitos publicados. Membros e corretores já usam esta versão.");
      router.refresh();
    } catch {
      setError("Não foi possível salvar os quesitos. Tente novamente em instantes.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel-card flex flex-col gap-4">
      <div>
        <h2 className="panel-title">Quesitos avaliativos</h2>
        <p className="mt-1 text-sm text-muted">
          Usados pelo corretor na correção e no cálculo automático da nota (0 a 1000). Rascunho
          sincroniza no servidor até você publicar.
        </p>
      </div>

      {hasUnpublishedChanges ? (
        <EditalDraftStatusBanner
          draftUpdatedAt={draftSavedAt}
          publishedRevisionMismatch={draftRevisionMismatch}
        />
      ) : (
        <p role="status" className="text-sm text-muted">
          Quesitos publicados — sem alterações pendentes.
        </p>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <EvaluationRubricEditor value={rubric} onChange={setRubric} />
        {error ? <p className="alert-error">{error}</p> : null}
        {message ? <p className="alert-success">{message}</p> : null}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending || !hasUnpublishedChanges}
            className="btn-primary w-fit"
          >
            {pending ? "Publicando..." : "Salvar e publicar quesitos"}
          </button>
          <button
            type="button"
            className="btn-secondary w-fit"
            disabled={pending || !hasUnpublishedChanges}
            onClick={discardDraft}
          >
            Cancelar alterações
          </button>
        </div>
      </form>
    </section>
  );
}
