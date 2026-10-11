"use client";

import { FormEvent, useState } from "react";
import { ImageAttachmentPicker } from "@/components/support/image-attachment-picker";

type SupportTicketReplyFormProps = {
  ticketId: string;
};

export function SupportTicketReplyForm({ ticketId }: SupportTicketReplyFormProps) {
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [closeTicket, setCloseTicket] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);

    const form = new FormData();
    form.append("body", body);
    form.append("closeTicket", closeTicket ? "true" : "false");
    if (file) form.append("file", file);

    const response = await fetch(`/api/support/${ticketId}/replies`, {
      method: "POST",
      body: form,
    });
    const data = (await response.json()) as { error?: string; message?: string };

    if (!response.ok) {
      setError(data.error ?? "Não foi possível enviar a resposta.");
      setPending(false);
      return;
    }

    setMessage(data.message ?? "Resposta enviada.");
    setBody("");
    setFile(null);
    setPending(false);
    window.location.reload();
  }

  return (
    <form onSubmit={onSubmit} className="panel-card flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Responder ao aluno</h2>
      <p className="text-sm text-muted">
        O membro recebe um e-mail ao enviar. Use o botão WhatsApp abaixo para avisar com o
        protocolo do chamado.
      </p>

      <label className="flex flex-col gap-2 text-sm font-medium">
        Resposta
        <textarea
          className="field-input min-h-32 resize-y py-3"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Escreva a orientação ou solução para o aluno"
          required
          minLength={10}
        />
      </label>

      <ImageAttachmentPicker file={file} onFileChange={setFile} disabled={pending} />

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="font-medium">Após enviar a resposta</legend>
        <label className="flex items-start gap-2">
          <input
            type="radio"
            name="closeMode"
            checked={!closeTicket}
            onChange={() => setCloseTicket(false)}
            className="mt-1"
          />
          <span>
            <strong>Manter em aberto</strong> — o aluno lê a resposta e pode encerrar quando
            quiser (ou continuar a conversa).
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input
            type="radio"
            name="closeMode"
            checked={closeTicket}
            onChange={() => setCloseTicket(true)}
            className="mt-1"
          />
          <span>
            <strong>Encerrar chamado</strong> — finaliza agora; o aluno só consulta o histórico.
          </span>
        </label>
      </fieldset>

      {error ? <p className="alert-error">{error}</p> : null}
      {message ? <p className="alert-success">{message}</p> : null}

      <button type="submit" disabled={pending} className="btn-primary min-h-12 w-full sm:w-fit">
        {pending ? "Enviando..." : "Enviar resposta"}
      </button>
    </form>
  );
}
