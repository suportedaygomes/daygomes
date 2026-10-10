"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Use pelo menos 8 caracteres na nova senha.");
      return;
    }

    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(translateAuthError(updateError.message));
      setPending(false);
      return;
    }

    router.push("/painel");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-semibold tracking-[0.22em] text-purple uppercase">
          Day Gomes
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Nova senha
        </h1>
        <p className="mt-3 max-w-sm text-base leading-7 text-muted">
          Defina uma senha segura para continuar usando a plataforma.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Nova senha
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-14 rounded-2xl border border-white/10 bg-field px-4 text-base outline-none focus:border-purple focus:ring-4 focus:ring-purple/20"
            minLength={8}
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium">
          Confirmar senha
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="h-14 rounded-2xl border border-white/10 bg-field px-4 text-base outline-none focus:border-purple focus:ring-4 focus:ring-purple/20"
            minLength={8}
            required
          />
        </label>

        {error ? (
          <p role="alert" className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="h-14 rounded-2xl bg-purple-deep text-base font-semibold text-white disabled:opacity-70"
        >
          {pending ? "Salvando..." : "Salvar e entrar"}
        </button>
      </form>
    </div>
  );
}
