"use client";

import { useTheme } from "@/components/theme/theme-provider";

type ThemeToggleProps = {
  variant?: "pill" | "icon";
  className?: string;
};

export function ThemeToggle({ variant = "pill", className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--surface-elevated)] text-foreground transition hover:border-purple/40 hover:bg-purple/10 ${className}`}
        aria-label={isLight ? "Ativar modo escuro" : "Ativar modo claro"}
        title={isLight ? "Modo escuro" : "Modo claro"}
      >
        {isLight ? <MoonIcon /> : <SunIcon />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-elevated)] px-3 py-2 text-sm font-medium text-foreground transition hover:border-purple/40 hover:bg-purple/10 ${className}`}
      aria-label={isLight ? "Ativar modo escuro" : "Ativar modo claro"}
    >
      <span className="text-purple" aria-hidden>
        {isLight ? <MoonIcon /> : <SunIcon />}
      </span>
      {isLight ? "Modo escuro" : "Modo claro"}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 14.5A7.5 7.5 0 0 1 9.5 4 6.5 6.5 0 1 0 20 14.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}
