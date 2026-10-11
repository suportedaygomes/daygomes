"use client";

import { useEffect, useRef, useState } from "react";
import { IMAGE_MIMES, MAX_ATTACHMENT_BYTES } from "@/lib/support/validate";

type ImageAttachmentPickerProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  compact?: boolean;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageAttachmentPicker({
  file,
  onFileChange,
  disabled = false,
  compact = false,
}: ImageAttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pickFile() {
    if (!disabled) inputRef.current?.click();
  }

  function validateAndSet(next: File | null) {
    setLocalError("");
    if (!next) {
      onFileChange(null);
      return;
    }
    if (!IMAGE_MIMES.has(next.type)) {
      setLocalError("Use uma foto em JPG, PNG ou WebP.");
      return;
    }
    if (next.size > MAX_ATTACHMENT_BYTES) {
      setLocalError("A foto deve ter no máximo 8 MB. Tente outra imagem.");
      return;
    }
    onFileChange(next);
  }

  function onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    validateAndSet(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) validateAndSet(dropped);
  }

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="sr-only"
          disabled={disabled}
          onChange={onInputChange}
        />
        {!file ? (
          <button
            type="button"
            disabled={disabled}
            onClick={pickFile}
            className="btn-secondary min-h-9 px-3 text-xs"
          >
            Foto (opcional)
          </button>
        ) : (
          <>
            <span className="max-w-[10rem] truncate text-xs text-muted">{file.name}</span>
            <button
              type="button"
              className="text-xs text-purple hover:underline"
              disabled={disabled}
              onClick={pickFile}
            >
              Trocar
            </button>
            <button
              type="button"
              className="text-xs text-muted hover:underline"
              disabled={disabled}
              onClick={() => validateAndSet(null)}
            >
              Remover
            </button>
          </>
        )}
        {localError ? <p className="alert-error w-full text-xs">{localError}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium">Foto do problema (opcional)</span>
      <p className="text-sm leading-6 text-muted">
        Se ajudar a explicar, envie uma captura de tela ou foto. Toque no botão roxo ou
        arraste a imagem para a área abaixo.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        disabled={disabled}
        onChange={onInputChange}
      />

      {!file ? (
        <button
          type="button"
          disabled={disabled}
          onClick={pickFile}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex min-h-[11rem] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
            dragOver
              ? "border-purple bg-purple/15"
              : "border-white/25 bg-field/60 hover:border-purple/50 hover:bg-purple/10"
          }`}
        >
          <span
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple/25 text-purple"
            aria-hidden
          >
            <CameraIcon />
          </span>
          <span className="text-base font-semibold">Adicionar foto</span>
          <span className="max-w-xs text-sm text-muted">
            Toque aqui para abrir a galeria ou a câmera do celular
          </span>
        </button>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-field/50">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Pré-visualização da foto anexada"
              className="max-h-64 w-full object-contain bg-black/30"
            />
          ) : null}
          <div className="flex flex-col gap-2 p-4 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="min-w-0 flex-1">
              <p role="status" className="text-sm font-medium text-emerald-200/95">
                Arquivo anexado
              </p>
              <p className="mt-1 text-sm">
                <span className="font-medium">{file.name}</span>
                <span className="text-muted"> · {formatFileSize(file.size)}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary min-h-11 px-5 text-sm"
                disabled={disabled}
                onClick={pickFile}
              >
                Trocar foto
              </button>
              <button
                type="button"
                className="btn-secondary min-h-11 px-5 text-sm"
                disabled={disabled}
                onClick={() => validateAndSet(null)}
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted">Formatos: JPG, PNG ou WebP · tamanho máximo 8 MB</p>
      {localError ? <p className="alert-error text-sm">{localError}</p> : null}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8h2l1.5-2h9L18 8h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
