"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "daygomes-pwa-hint-dismissed";

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay()) return;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    if (window.innerWidth > 1024) return;

    const timer = window.setTimeout(() => setVisible(true), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-modal)] p-4 shadow-[0_-8px_32px_rgba(0,0,0,0.35)] sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-sm sm:rounded-2xl sm:border"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      role="status"
    >
      <p className="text-sm font-semibold">Instalar no celular ou tablet</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        No Chrome ou Edge: menu ⋮ → &quot;Instalar app&quot; ou &quot;Adicionar à tela inicial&quot;.
        No iPhone: Compartilhar → Adicionar à Tela de Início.
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn-primary btn-sm flex-1" onClick={dismiss}>
          Entendi
        </button>
      </div>
    </div>
  );
}
