"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function subscribe() {
  return () => {};
}

function showIosInstallHint() {
  const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  return ios && !standalone;
}

export function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const iosHint = useSyncExternalStore(subscribe, showIosInstallHint, () => false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (promptEvent) {
    return (
      <button
        type="button"
        onClick={async () => {
          await promptEvent.prompt();
          setPromptEvent(null);
        }}
        className="h-12 w-full rounded-2xl border border-white/15 text-sm font-medium text-foreground transition hover:border-purple/60 hover:bg-white/5"
      >
        Instalar app
      </button>
    );
  }

  if (!iosHint) return null;

  return (
    <p className="text-center text-sm leading-6 text-muted">
      No iPhone ou iPad, toque em Compartilhar e escolha Adicionar à Tela de Início.
    </p>
  );
}
