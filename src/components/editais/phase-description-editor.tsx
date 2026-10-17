"use client";

import { useCallback, useLayoutEffect, useRef, type ReactNode } from "react";
import {
  isPhaseDescriptionEmpty,
  normalizePhaseDescriptionForDisplay,
  sanitizePhaseDescriptionHtml,
} from "@/lib/rich-text/phase-description";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  "aria-label"?: string;
};

function closestList(
  node: Node | null,
  tag: "OL" | "UL",
): HTMLOListElement | HTMLUListElement | null {
  let current: Node | null = node;
  while (current && current instanceof HTMLElement) {
    if (current.tagName === tag) return current as HTMLOListElement | HTMLUListElement;
    current = current.parentNode;
  }
  return null;
}

export function PhaseDescriptionEditor({
  value,
  onChange,
  placeholder = "Orientações para o aluno…",
  "aria-label": ariaLabel = "Descrição da fase",
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  /** null = ainda não hidratou o DOM com `value` (evita sobrescrever com vazio no blur). */
  const lastValueRef = useRef<string | null>(null);
  const canEmitRef = useRef(false);

  const syncFromValue = useCallback((nextValue: string) => {
    const el = editorRef.current;
    if (!el) return;
    if (nextValue === lastValueRef.current) return;
    lastValueRef.current = nextValue;
    el.innerHTML = nextValue ? normalizePhaseDescriptionForDisplay(nextValue) : "";
    canEmitRef.current = true;
  }, []);

  const emitHtml = useCallback(() => {
    if (!canEmitRef.current) return;
    const el = editorRef.current;
    if (!el) return;
    const sanitized = sanitizePhaseDescriptionHtml(el.innerHTML);
    lastValueRef.current = sanitized;
    onChange(sanitized);
  }, [onChange]);

  useLayoutEffect(() => {
    syncFromValue(value);
  }, [value, syncFromValue]);

  function focusEditor() {
    editorRef.current?.focus();
  }

  function runCommand(command: string, argument?: string) {
    focusEditor();
    document.execCommand(command, false, argument);
    emitHtml();
  }

  function setAlphaList() {
    focusEditor();
    document.execCommand("insertOrderedList");
    const selection = window.getSelection();
    const anchor = selection?.anchorNode ?? null;
    const ol = closestList(anchor, "OL");
    if (ol) {
      ol.setAttribute("type", "a");
    }
    emitHtml();
  }

  function onPaste(event: React.ClipboardEvent) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    emitHtml();
  }

  const empty = isPhaseDescriptionEmpty(value);

  return (
    <div className="flex flex-col gap-2">
      <div
        className="overflow-hidden rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--field)] focus-within:border-[color:var(--purple)] focus-within:shadow-[0_0_0_4px_rgba(171,95,208,0.2)]"
      >
      <div
        className="flex flex-wrap gap-1 border-b border-[color:var(--border-subtle)] bg-black/25 p-2"
        role="toolbar"
        aria-label="Formatação do texto"
      >
        <ToolbarButton title="Negrito" onClick={() => runCommand("bold")}>
          <strong>N</strong>
        </ToolbarButton>
        <ToolbarButton title="Itálico" onClick={() => runCommand("italic")}>
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton title="Sublinhado" onClick={() => runCommand("underline")}>
          <span className="underline">S</span>
        </ToolbarButton>
        <span className="mx-1 w-px self-stretch bg-white/15" aria-hidden />
        <ToolbarButton title="Alinhar à esquerda" onClick={() => runCommand("justifyLeft")}>
          Esq
        </ToolbarButton>
        <ToolbarButton title="Centralizar" onClick={() => runCommand("justifyCenter")}>
          Centro
        </ToolbarButton>
        <ToolbarButton title="Alinhar à direita" onClick={() => runCommand("justifyRight")}>
          Dir
        </ToolbarButton>
        <span className="mx-1 w-px self-stretch bg-white/15" aria-hidden />
        <ToolbarButton title="Lista com marcadores" onClick={() => runCommand("insertUnorderedList")}>
          •
        </ToolbarButton>
        <ToolbarButton title="Lista numerada" onClick={() => runCommand("insertOrderedList")}>
          1.
        </ToolbarButton>
        <ToolbarButton title="Lista com letras (a, b, c)" onClick={setAlphaList}>
          a.
        </ToolbarButton>
      </div>
      <div className="relative min-h-32 max-h-[min(28rem,60vh)] overflow-y-auto">
        {empty ? (
          <p className="pointer-events-none absolute left-4 top-3 text-sm text-muted/70">
            {placeholder}
          </p>
        ) : null}
        <div
          ref={editorRef}
          role="textbox"
          aria-label={ariaLabel}
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          className="phase-description-prose phase-description-editor min-h-32 px-4 py-3 text-base text-[color:var(--foreground)] outline-none"
          onInput={emitHtml}
          onBlur={emitHtml}
          onPaste={onPaste}
        />
      </div>
      </div>
      <p className="text-xs text-muted">
        Use a barra para negrito, listas e alinhamento. O aluno verá o texto formatado.
      </p>
    </div>
  );
}

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-white/10 bg-black/30 px-2 text-sm hover:bg-white/10"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
