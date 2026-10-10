"use client";

import { FormEvent, useState } from "react";
import { createUserAsAdmin } from "@/app/actions/admin-users";
import { formatCpf, normalizeCpf } from "@/lib/cpf";
import { ROLE_LABELS, USER_ROLES, type UserRole } from "@/lib/roles";

export function CreateUserForm() {
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("membro");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);

    const result = await createUserAsAdmin({
      fullName,
      cpf: normalizeCpf(cpf),
      email,
      role,
    });

    if (!result.ok) {
      setError(result.message);
      setPending(false);
      return;
    }

    setMessage(result.message);
    setFullName("");
    setCpf("");
    setEmail("");
    setRole("membro");
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Nome completo
        <input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="field-input"
          placeholder="Nome e sobrenome"
          required
          maxLength={120}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium">
        CPF
        <input
          value={cpf}
          onChange={(event) => setCpf(formatCpf(event.target.value))}
          className="field-input"
          placeholder="000.000.000-00"
          inputMode="numeric"
          required
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium">
        E-mail
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="field-input"
          placeholder="usuario@email.com"
          required
          maxLength={254}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium">
        Tipo de usuário
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as UserRole)}
          className="field-input"
        >
          {USER_ROLES.map((item) => (
            <option key={item} value={item}>
              {ROLE_LABELS[item]}
            </option>
          ))}
        </select>
      </label>

      <p className="text-sm text-muted">
        A senha inicial será <strong className="text-foreground">daygomes</strong>. O
        usuário pode alterá-la em Meu perfil.
      </p>

      {error ? (
        <p role="alert" className="alert-error">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="alert-success">
          {message}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Criando..." : "Criar usuário"}
      </button>
    </form>
  );
}
