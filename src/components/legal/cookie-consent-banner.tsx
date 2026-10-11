"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { COOKIE_CONSENT_STORAGE_KEY } from "@/lib/legal/site";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const accepted = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
      if (!accepted) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "accepted");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#121216]/95 p-4 backdrop-blur-md sm:p-5"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 text-sm leading-6 text-muted">
          <p id="cookie-banner-title" className="font-semibold text-foreground">
            Cookies e armazenamento local
          </p>
          <p className="mt-1">
            Usamos cookies necessários para login e sessão, e armazenamento local para
            preferências (como tema e este aviso). Saiba mais na{" "}
            <Link href="/cookies" className="text-purple hover:underline">
              Política de Cookies
            </Link>{" "}
            e na{" "}
            <Link href="/privacidade" className="text-purple hover:underline">
              Política de Privacidade
            </Link>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={accept}
          className="btn-primary shrink-0 px-6 py-2.5 text-sm"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
