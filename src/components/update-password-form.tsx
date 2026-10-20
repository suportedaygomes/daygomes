"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";
import { SITE_DISPLAY_NAME } from "@/lib/legal/site";

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
          {SITE_DISPLAY_NAME}
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
            className="h-14 rounded-2xl border border-[color:var(--border-subtle)] bg-field px-4 text-base outline-none focus:border-purple focus:ring-4 focus:ring-purple/20"
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
            className="h-14 rounded-2xl border border-[color:var(--border-subtle)] bg-field px-4 text-base outline-none focus:border-purple focus:ring-4 focus:ring-purple/20"
            minLength={8}
            required
          />
        </label>

        {error ? (
          <p
            role="alert"
            className="rounded-2xl border border-[color:var(--alert-error-border)] bg-[color:var(--alert-error-bg)] px-4 py-3 text-sm leading-6 text-[color:var(--alert-error-text)]"
          >
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
