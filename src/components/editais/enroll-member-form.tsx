"use client";

import { FormEvent, useMemo, useState } from "react";
import { enrollMemberInEdital } from "@/app/actions/editais";

type MemberOption = { id: string; full_name: string | null; email: string | null };
type CargoOption = { id: string; name: string };

type EnrollMemberFormProps = {
  editalId: string;
  members: MemberOption[];
  cargos: CargoOption[];
};

export function EnrollMemberForm({ editalId, members, cargos }: EnrollMemberFormProps) {
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [cargoId, setCargoId] = useState(cargos[0]?.id ?? "");
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

    const result = await enrollMemberInEdital({ memberId, editalId, cargoId });
    if (!result.ok) {
      setError(result.message);
    } else {
      setMessage(result.message);
    }
    setPending(false);
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
        Cargo
        <select className="field-input" value={cargoId} onChange={(e) => setCargoId(e.target.value)}>
          {cargos.map((cargo) => (
            <option key={cargo.id} value={cargo.id}>{cargo.name}</option>
          ))}
        </select>
      </label>
      {error ? <p className="alert-error">{error}</p> : null}
      {message ? <p className="alert-success">{message}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Vinculando..." : "Vincular membro"}
      </button>
    </form>
  );
}
