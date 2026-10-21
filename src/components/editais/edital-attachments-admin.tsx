"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import {
  type EditalAttachmentView,
  editalAttachmentDownloadPath,
  formatAttachmentSize,
} from "@/lib/editais/attachments-shared";

type EditalAttachmentsAdminProps = {
  editalId: string;
  initialAttachments: EditalAttachmentView[];
};

export function EditalAttachmentsAdmin({
  editalId,
  initialAttachments,
}: EditalAttachmentsAdminProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [publishPending, setPublishPending] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const unpublishedCount = useMemo(
    () => initialAttachments.filter((item) => !item.isPublished).length,
    [initialAttachments],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!file) {
      setError("Selecione um arquivo.");
      return;
    }

    setPending(true);
    const form = new FormData();
    form.append("file", file);
    form.append("title", title);
    form.append("description", description);

    const response = await fetch(`/api/editais/${editalId}/attachments`, {
      method: "POST",
      body: form,
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(payload?.error ?? "Não foi possível enviar o anexo.");
      setPending(false);
      return;
    }

    setTitle("");
    setDescription("");
    setFile(null);
    setMessage("Anexo enviado como rascunho. Publique para os membros baixarem.");
    setPending(false);
    router.refresh();
  }

  async function onPublishDrafts() {
    setError("");
    setMessage("");
    setPublishPending(true);

    try {
      const response = await fetch(`/api/admin/editais/${editalId}/attachments/publish`, {
        method: "POST",
      });
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
      } | null;
      if (!response.ok || !result?.ok) {
        setError(result?.message ?? "Não foi possível publicar os anexos.");
        return;
      }
      setMessage(result.message ?? "Anexos publicados.");
      router.refresh();
    } catch {
      setError("Não foi possível publicar os anexos. Tente novamente.");
    } finally {
      setPublishPending(false);
    }
  }

  async function onRemove(attachmentId: string) {
    setError("");
    setMessage("");
    setRemovingId(attachmentId);

    const response = await fetch(`/api/editais/${editalId}/attachments/${attachmentId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Não foi possível remover o anexo.");
      setRemovingId(null);
      return;
    }

    setMessage("Anexo removido.");
    setRemovingId(null);
    router.refresh();
  }

  return (
    <section className="panel-card flex flex-col gap-5">
      <div>
        <h2 className="panel-title">Anexos do edital</h2>
        <p className="mt-1 text-sm text-muted">
          Novos arquivos ficam como <strong className="font-medium text-foreground">rascunho</strong>{" "}
          até publicar. Membros só veem anexos publicados (qualquer formato, até 25 MB por arquivo).
        </p>
      </div>

      {unpublishedCount > 0 ? (
        <div
          role="status"
          className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100"
        >
          <p className="font-semibold text-amber-50">
            {unpublishedCount} anexo(s) aguardando publicação
          </p>
          <p className="mt-1 text-amber-100/90">
            Visíveis para você no painel; alunos ainda não baixam até publicar.
          </p>
          <button
            type="button"
            className="btn-primary btn-sm mt-3"
            disabled={publishPending}
            onClick={onPublishDrafts}
          >
            {publishPending ? "Publicando..." : "Publicar anexos pendentes"}
          </button>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-xl border border-white/10 p-4">
        <label className="flex flex-col gap-2 text-sm font-medium">
          Título
          <input
            className="field-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={160}
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Descrição
          <textarea
            className="field-input min-h-20 resize-y py-3"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={2000}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Arquivo
          <input
            type="file"
            className="field-input py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-purple/20 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            required
          />
        </label>
        <button type="submit" disabled={pending} className="btn-primary btn-sm w-fit">
          {pending ? "Enviando..." : "Adicionar anexo (rascunho)"}
        </button>
      </form>

      {initialAttachments.length ? (
        <ul className="flex flex-col gap-3">
          {initialAttachments.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-white/10 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold">
                  {item.title}
                  {!item.isPublished ? (
                    <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-100">
                      Rascunho
                    </span>
                  ) : null}
                </p>
                {item.description ? (
                  <p className="mt-1 text-sm text-muted">{item.description}</p>
                ) : null}
                <p className="mt-2 text-xs text-muted">
                  {item.originalFilename} · {formatAttachmentSize(item.fileSize)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={editalAttachmentDownloadPath(editalId, item.id)}
                  className="btn-secondary btn-sm"
                >
                  Baixar
                </a>
                <button
                  type="button"
                  className="btn-secondary btn-sm text-red-300"
                  disabled={removingId === item.id}
                  onClick={() => onRemove(item.id)}
                >
                  {removingId === item.id ? "Removendo..." : "Remover"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Nenhum anexo ainda.</p>
      )}

      {error ? <p className="alert-error text-sm">{error}</p> : null}
      {message ? <p className="alert-success text-sm">{message}</p> : null}
    </section>
  );
}
