"use client";

import { FormEvent, useState } from "react";
import { updateEditalEvaluationRubric } from "@/app/actions/editais";
import { EvaluationRubricEditor } from "@/components/editais/evaluation-rubric-editor";
import type { EditalEvaluationRubric } from "@/lib/editais/evaluation-rubric";
import { emptyEvaluationRubric } from "@/lib/editais/evaluation-rubric";

type Props = {
  editalId: string;
  initialRubric: EditalEvaluationRubric | null;
};

export function EditalEvaluationRubricAdmin({ editalId, initialRubric }: Props) {
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

    const result = await updateEditalEvaluationRubric({ editalId, rubric });
    if (!result.ok) {
      setError(result.message);
    } else {
      setMessage(result.message);
    }
    setPending(false);
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
