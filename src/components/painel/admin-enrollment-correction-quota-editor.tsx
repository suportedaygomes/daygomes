"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { updateMemberEnrollmentCorrectionsRemaining } from "@/app/actions/member-enrollments";
import { MAX_ADMIN_ENROLLMENT_CORRECTION_QUOTA } from "@/lib/editais/enrollment-quota";

type AdminEnrollmentCorrectionQuotaEditorProps = {
  enrollmentId: string;
  memberId: string;
  correctionsUsed: number;
  correctionsRemaining: number;
  correctionQuota: number;
};

export function AdminEnrollmentCorrectionQuotaEditor({
  enrollmentId,
  memberId,
  correctionsUsed,
  correctionsRemaining: initialRemaining,
  correctionQuota,
}: AdminEnrollmentCorrectionQuotaEditorProps) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(String(initialRemaining));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const maxRemaining = Math.max(0, MAX_ADMIN_ENROLLMENT_CORRECTION_QUOTA - correctionsUsed);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);

    const value = Number(remaining);
    if (!Number.isFinite(value) || value < 0 || value > maxRemaining) {
      setPending(false);
      setError(`Informe um número entre 0 e ${maxRemaining}.`);
      return;
    }

    const result = await updateMemberEnrollmentCorrectionsRemaining(
      enrollmentId,
      value,
      memberId,
    );
    setPending(false);

    if (!result.ok || !("correctionsRemaining" in result)) {
      setError(result.ok ? "Resposta inválida." : result.message);
      return;
    }

    setRemaining(String(result.correctionsRemaining));
    setMessage(
      `Salvo: ${result.correctionsRemaining} disponível(is), ${result.correctionsUsed} usada(s), cota total ${result.correctionQuota}.`,
    );
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 rounded-xl border border-purple/25 bg-purple/5 p-3"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-purple">Ajuste manual (admin)</p>
      <p className="mt-1 text-xs text-muted">
        Define quantas correções o aluno ainda pode usar nesta mentoria. A cota total passa a ser{" "}
        <span className="tabular-nums">usadas + disponíveis</span> (hoje: {correctionsUsed} +{" "}
        {initialRemaining} = {correctionQuota}).
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Correções disponíveis agora
          <input
            type="number"
            className="field-input w-28 tabular-nums"
            min={0}
            max={maxRemaining}
            step={1}
            value={remaining}
            onChange={(event) => setRemaining(event.target.value)}
            disabled={pending}
          />
        </label>
        <button type="submit" className="btn-primary btn-sm" disabled={pending}>
          {pending ? "Salvando…" : "Salvar cota"}
        </button>
      </div>
      {error ? <p className="alert-error mt-2 text-xs">{error}</p> : null}
      {message ? <p className="alert-success mt-2 text-xs">{message}</p> : null}
    </form>
  );
}
