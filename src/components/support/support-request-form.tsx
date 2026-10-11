"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ImageAttachmentPicker } from "@/components/support/image-attachment-picker";
import { formatWhatsappDisplay, normalizeWhatsapp } from "@/lib/support/validate";

export type SupportRequestFormDefaults = {
  email: string;
  whatsapp: string;
  fullName?: string;
};

type SupportRequestFormProps = {
  mode: "guest" | "member";
  defaults?: SupportRequestFormDefaults;
  /** Layout enxuto para caber em uma tela (página pública). */
  compact?: boolean;
};

export function SupportRequestForm({
  mode,
  defaults,
  compact = false,
}: SupportRequestFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(defaults?.email ?? "");
  const [whatsapp, setWhatsapp] = useState(defaults?.whatsapp ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const lockedContact = mode === "member";
  const profileWhatsappDigits = normalizeWhatsapp(defaults?.whatsapp ?? "");
  const whatsappLocked = lockedContact && profileWhatsappDigits.length >= 10;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);

    const body = new FormData();
    body.append("email", email);
    body.append("whatsapp", whatsapp);
    body.append("title", title);
    body.append("description", description);
    if (file) body.append("file", file);

    const response = await fetch("/api/support", { method: "POST", body });
    const data = (await response.json()) as { error?: string; message?: string };

    if (!response.ok) {
      setError(data.error ?? "Não foi possível enviar.");
      setPending(false);
      return;
    }

    setMessage("Ticket enviado.");
    setTitle("");
    setDescription("");
    setFile(null);
    setPending(false);

    if (mode === "member") {
      router.refresh();
    }
  }

  const gap = compact ? "gap-3" : "gap-4";
  const cardPad = compact ? "px-4 py-4 sm:px-5 sm:py-5" : "";
  const labelClass = `flex flex-col gap-1.5 font-medium ${compact ? "text-sm" : "text-sm"}`;
  const inputCompact = compact ? "min-h-11 py-2.5 text-sm" : "";

  const contactFields = (
    <>
      <div className={`grid gap-3 sm:grid-cols-2 ${compact ? "" : "gap-4"}`}>
        <label className={labelClass}>
          E-mail
          <input
            type="email"
            className={`field-input ${inputCompact}`}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            readOnly={lockedContact}
            required
          />
        </label>

        <label className={labelClass}>
          WhatsApp
          <input
            type="tel"
            className={`field-input ${inputCompact}`}
            value={whatsappLocked ? formatWhatsappDisplay(whatsapp) : whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            readOnly={whatsappLocked}
            placeholder="(11) 99999-9999"
            required
          />
        </label>
      </div>

      {lockedContact && !whatsappLocked ? (
        <p className="text-xs text-muted">
          Informe seu WhatsApp com DDD para a equipe poder retornar o contato.
        </p>
      ) : null}

      <label className={labelClass}>
        Título
        <input
          type="text"
          className={`field-input ${inputCompact}`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Resumo do problema"
          required
          maxLength={120}
        />
      </label>
    </>
  );

  const detailFields = (
    <>
      <label className={labelClass}>
        Descrição
        <textarea
          className={`field-input resize-none py-2.5 ${
            compact ? "min-h-[4.75rem] text-sm leading-snug" : "min-h-28 resize-y py-3"
          }`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={
            compact ? "O que aconteceu?" : "Explique o que aconteceu e como podemos ajudar"
          }
          required
          rows={compact ? 4 : undefined}
        />
      </label>

      <ImageAttachmentPicker
        file={file}
        onFileChange={setFile}
        disabled={pending}
        compact={compact}
      />
      {error ? <p className="alert-error">{error}</p> : null}
      {message ? <p className="alert-success">{message}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className={`btn-primary w-full ${compact ? "min-h-11 text-sm" : "min-h-12 text-base sm:w-fit sm:px-8"}`}
      >
        {pending ? "Enviando..." : compact ? "Enviar" : "Enviar pedido de ajuda"}
      </button>
    </>
  );

  return (
    <form onSubmit={onSubmit} className={`panel-card flex min-h-0 flex-col ${gap} ${cardPad}`}>
      {defaults?.fullName && lockedContact ? (
        <div>
          <p className="text-sm text-muted">Nome</p>
          <p className="font-medium">{defaults.fullName}</p>
        </div>
      ) : null}

      {contactFields}
      {detailFields}
    </form>
  );
}
