"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { EvaluationRubricEditor } from "@/components/editais/evaluation-rubric-editor";
import type { EditalEvaluationRubric } from "@/lib/editais/evaluation-rubric";
import { emptyEvaluationRubric } from "@/lib/editais/evaluation-rubric";

type Props = {
  editalId: string;
  initialRubric: EditalEvaluationRubric | null;
};

export function EditalEvaluationRubricAdmin({ editalId, initialRubric }: Props) {
  const router = useRouter();
  const [rubric, setRubric] = useState<EditalEvaluationRubric>(
    initialRubric ?? emptyEvaluationRubric(),
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

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
      setMessage(result.message ?? "Quesitos avaliativos salvos.");
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
          Usados pelo corretor na correção e no cálculo automático da nota (0 a 1000).
        </p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <EvaluationRubricEditor value={rubric} onChange={setRubric} />
        {error ? <p className="alert-error">{error}</p> : null}
        {message ? <p className="alert-success">{message}</p> : null}
        <button type="submit" disabled={pending} className="btn-primary w-fit">
          {pending ? "Salvando..." : "Salvar quesitos"}
        </button>
      </form>
    </section>
  );
}
