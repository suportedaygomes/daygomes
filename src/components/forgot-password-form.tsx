"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Informe um e-mail válido.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent("/login/atualizar-senha")}`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo,
    });

    if (resetError) {
      setError(translateAuthError(resetError.message));
      setPending(false);
      return;
    }

    setSuccess(
      "Se existir uma conta com este e-mail, enviamos um link para redefinir a senha. Verifique também o spam.",
    );
    setPending(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-semibold tracking-[0.22em] text-purple uppercase">
          Day Gomes
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Recuperar senha
        </h1>
        <p className="mt-3 max-w-sm text-base leading-7 text-muted">
          Enviaremos um link para o e-mail cadastrado na plataforma.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <label className="flex flex-col gap-2 text-sm font-medium">
          E-mail
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-14 rounded-2xl border border-white/10 bg-field px-4 text-base font-normal text-foreground outline-none transition focus:border-purple focus:ring-4 focus:ring-purple/20"
            placeholder="voce@email.com"
            required
          />
        </label>

        {error ? (
          <p role="alert" className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </p>
        ) : null}

        {success ? (
          <p role="status" className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="h-14 rounded-2xl bg-purple-deep text-base font-semibold text-white shadow-[0_12px_32px_rgba(142,62,190,0.35)] transition hover:brightness-110 disabled:opacity-70"
        >
          {pending ? "Enviando..." : "Enviar link"}
        </button>

        <Link href="/login" className="text-center text-sm text-muted hover:text-foreground">
          Voltar ao login
        </Link>
      </form>
    </div>
  );
}
