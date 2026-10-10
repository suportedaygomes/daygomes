"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";
import { InstallPrompt } from "@/components/install-prompt";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Informe o e-mail.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Informe um e-mail válido.");
      return;
    }

    if (!password) {
      setError("Informe a senha.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (signInError) {
      setError(translateAuthError(signInError.message));
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
          Entrar
        </h1>
        <p className="mt-3 max-w-sm text-base leading-7 text-muted">
          Use o e-mail e a senha da sua conta.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <label className="flex flex-col gap-2 text-sm font-medium">
          E-mail
          <input
            type="email"
            name="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="email"
            spellCheck={false}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-14 rounded-2xl border border-white/10 bg-field px-4 text-base font-normal text-foreground outline-none transition focus:border-purple focus:ring-4 focus:ring-purple/20"
            placeholder="voce@email.com"
            maxLength={254}
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium">
          Senha
          <span className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-14 w-full rounded-2xl border border-white/10 bg-field px-4 pr-14 text-base font-normal text-foreground outline-none transition focus:border-purple focus:ring-4 focus:ring-purple/20"
              placeholder="Sua senha"
              maxLength={128}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              className="absolute top-1/2 right-2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-muted transition hover:text-foreground"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </span>
        </label>

        {error ? (
          <p
            role="alert"
            className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="h-14 rounded-2xl bg-purple-deep text-base font-semibold text-white shadow-[0_12px_32px_rgba(142,62,190,0.35)] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-center text-sm text-muted">
          <Link href="/login/recuperar" className="text-purple-light hover:underline">
            Esqueci minha senha
          </Link>
        </p>

        <InstallPrompt />
      </form>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 4.5 20 19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9.2 6.9A8.8 8.8 0 0 1 12 6.5c6 0 9.5 5.5 9.5 5.5a16 16 0 0 1-3.2 3.6M6.1 8.2C3.9 9.8 2.5 12 2.5 12S6 17.5 12 17.5c1.1 0 2.1-.2 3-.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
