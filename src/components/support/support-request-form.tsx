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
};

export function SupportRequestForm({ mode, defaults }: SupportRequestFormProps) {
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

  return (
    <form onSubmit={onSubmit} className="panel-card flex flex-col gap-4">
      {defaults?.fullName && lockedContact ? (
        <div>
          <p className="text-sm text-muted">Nome</p>
          <p className="font-medium">{defaults.fullName}</p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium">
          E-mail
          <input
            type="email"
            className="field-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            readOnly={lockedContact}
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium">
          WhatsApp
          <input
            type="tel"
            className="field-input"
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

      <label className="flex flex-col gap-2 text-sm font-medium">
        Título
        <input
          type="text"
          className="field-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Resumo do problema"
          required
          maxLength={120}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium">
        Descrição
        <textarea
          className="field-input min-h-28 resize-y py-3"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Explique o que aconteceu e como podemos ajudar"
          required
        />
      </label>

      <ImageAttachmentPicker
        file={file}
        onFileChange={setFile}
        disabled={pending}
      />
      {error ? <p className="alert-error">{error}</p> : null}
      {message ? <p className="alert-success">{message}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary min-h-12 w-full text-base sm:w-fit sm:px-8"
      >
        {pending ? "Enviando..." : "Enviar pedido de ajuda"}
      </button>
    </form>
  );
}
