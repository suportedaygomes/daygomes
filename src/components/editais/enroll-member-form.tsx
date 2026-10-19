"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { enrollMemberInEdital } from "@/app/actions/editais";

type MemberOption = { id: string; full_name: string | null; email: string | null };
import {
  MAX_CORRECTION_QUOTA,
  MIN_ADMIN_CORRECTION_QUOTA,
} from "@/lib/editais/enrollment-quota";

type EnrollMemberFormProps = {
  editalId: string;
  members: MemberOption[];
};

export function EnrollMemberForm({ editalId, members }: EnrollMemberFormProps) {
  const router = useRouter();
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [correctionQuota, setCorrectionQuota] = useState(4);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const memberOptions = useMemo(
    () =>
      members.map((member) => ({
        id: member.id,
        label: `${member.full_name ?? "Sem nome"} (${member.email ?? "sem e-mail"})`,
      })),
    [members],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);

    try {
      const result = await enrollMemberInEdital({ memberId, editalId, correctionQuota });
      if (!result?.ok) {
        setError(result?.message ?? "Não foi possível vincular o membro.");
        return;
      }
      setMessage(result.message);
      router.refresh();
    } catch {
      setError("Não foi possível vincular o membro. Atualize a página e tente de novo.");
    } finally {
      setPending(false);
    }
  }

  if (!members.length) {
    return <p className="text-sm text-muted">Cadastre membros em Usuários antes de vincular.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium">
        Membro
        <select className="field-input" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          {memberOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Correções incluídas (envios)
        <input
          type="number"
          min={MIN_ADMIN_CORRECTION_QUOTA}
          max={MAX_CORRECTION_QUOTA}
          className="field-input max-w-xs"
          value={correctionQuota}
          onChange={(e) => setCorrectionQuota(Number(e.target.value))}
          required
        />
      </label>
      <p className="text-xs text-muted">
        Quantidade de envios que o membro pode fazer nesta mentoria (entre{" "}
        {MIN_ADMIN_CORRECTION_QUOTA} e{" "}
        {MAX_CORRECTION_QUOTA}), em qualquer cargo ou modalidade.
      </p>
      {error ? <p className="alert-error">{error}</p> : null}
      {message ? <p className="alert-success">{message}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Vinculando..." : "Vincular membro"}
      </button>
    </form>
  );
}
