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

const BLOCK_TAGS = new Set(["P", "DIV", "LI"]);

type TextAlign = "left" | "center" | "right";

const ALIGN_INLINE_CLASS: Record<TextAlign, string> = {
  left: "phase-text-align-left",
  center: "phase-text-align-center",
  right: "phase-text-align-right",
};

function isAlignInlineSpan(element: HTMLElement) {
  return Object.values(ALIGN_INLINE_CLASS).some((className) => element.classList.contains(className));
}

function closestBlock(node: Node | null, root: HTMLElement): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== root) {
    if (current instanceof HTMLElement && BLOCK_TAGS.has(current.tagName)) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

function wrapOrphanTextInParagraph(root: HTMLElement) {
  const hasBlockChild = Array.from(root.childNodes).some(
    (node) =>
      node instanceof HTMLElement &&
      (BLOCK_TAGS.has(node.tagName) || node.tagName === "UL" || node.tagName === "OL"),
  );
  if (hasBlockChild) return;

  const text = root.textContent ?? "";
  if (!text.trim()) return;

  const paragraph = document.createElement("p");
  while (root.firstChild) {
    paragraph.appendChild(root.firstChild);
  }
  root.appendChild(paragraph);
}

function blockHasMeaningfulText(element: HTMLElement) {
  const withoutBreaks = element.innerHTML.replace(/<br\s*\/?>/gi, "");
  if (withoutBreaks.trim()) return true;
  return Boolean((element.textContent ?? "").replace(/\u00a0/g, " ").trim());
}

function cleanupEmptyBlocks(root: HTMLElement) {
  const candidates = root.querySelectorAll("p, div");
  for (const node of candidates) {
    if (!(node instanceof HTMLElement) || node === root) continue;
    if (node.closest("ul, ol")) continue;
    if (!blockHasMeaningfulText(node)) {
      node.remove();
    }
  }
}

function applyAlignToBlock(block: HTMLElement, align: TextAlign) {
  block.style.textAlign = align;
  block.removeAttribute("align");
}

function blockIsFullySelected(block: HTMLElement, range: Range) {
  const full = document.createRange();
  full.selectNodeContents(block);
  return (
    range.compareBoundaryPoints(Range.START_TO_START, full) <= 0 &&
    range.compareBoundaryPoints(Range.END_TO_END, full) >= 0
  );
}

function closestAlignInlineSpan(node: Node | null, block: HTMLElement): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== block) {
    if (current instanceof HTMLElement && isAlignInlineSpan(current)) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

function unwrapAlignSpan(span: HTMLElement) {
  const parent = span.parentNode;
  if (!parent) return;
  while (span.firstChild) {
    parent.insertBefore(span.firstChild, span);
  }
  parent.removeChild(span);
}

/** Alinha só o trecho selecionado, sem criar outro parágrafo (evita “pulo” de linha). */
function alignPartialInBlock(block: HTMLElement, range: Range, align: TextAlign) {
  const working = range.cloneRange();
  const existingSpan = closestAlignInlineSpan(working.commonAncestorContainer, block);

  if (align === "left") {
    if (existingSpan && blockIsFullySelected(existingSpan, working)) {
      unwrapAlignSpan(existingSpan);
      return;
    }
    const fragment = working.extractContents();
    working.insertNode(fragment);
    return;
  }

  if (existingSpan && blockIsFullySelected(existingSpan, working)) {
    existingSpan.className = ALIGN_INLINE_CLASS[align];
    return;
  }

  const fragment = working.extractContents();
  if (!(fragment.textContent ?? "").replace(/\u00a0/g, " ").trim()) {
    return;
  }

  const span = document.createElement("span");
  span.className = ALIGN_INLINE_CLASS[align];
  span.appendChild(fragment);
  working.insertNode(span);
}

function siblingBlocksBetween(start: HTMLElement, end: HTMLElement): HTMLElement[] {
  const blocks: HTMLElement[] = [start];
  if (start === end) return blocks;

  let cursor: Element | null = start.nextElementSibling;
  while (cursor) {
    if (cursor instanceof HTMLElement && BLOCK_TAGS.has(cursor.tagName)) {
      blocks.push(cursor);
      if (cursor === end) break;
    }
    cursor = cursor.nextElementSibling;
  }

  return blocks;
}

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
  "aria-label": ariaLabel = "Descrição do tema",
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
    cleanupEmptyBlocks(el);
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

  function applyTextAlign(align: TextAlign) {
    const root = editorRef.current;
    if (!root) return;
    focusEditor();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    wrapOrphanTextInParagraph(root);
    const range = selection.getRangeAt(0).cloneRange();

    if (range.collapsed) {
      const block = closestBlock(range.startContainer, root);
      if (block) applyAlignToBlock(block, align);
      emitHtml();
      return;
    }

    const allText = (root.textContent ?? "").trim();
    const selectedText = range.toString().trim();
    if (allText.length > 0 && selectedText.length >= allText.length * 0.85) {
      for (const child of Array.from(root.children)) {
        if (child instanceof HTMLElement && BLOCK_TAGS.has(child.tagName)) {
          applyAlignToBlock(child, align);
        }
      }
      emitHtml();
      return;
    }

    const startBlock = closestBlock(range.startContainer, root);
    const endBlock = closestBlock(range.endContainer, root);
    if (!startBlock) {
      document.execCommand(
        align === "left" ? "justifyLeft" : align === "center" ? "justifyCenter" : "justifyRight",
      );
      emitHtml();
      return;
    }

    if (startBlock === endBlock) {
      if (blockIsFullySelected(startBlock, range)) {
        applyAlignToBlock(startBlock, align);
      } else {
        alignPartialInBlock(startBlock, range, align);
      }
      emitHtml();
      return;
    }

    for (const block of siblingBlocksBetween(startBlock, endBlock ?? startBlock)) {
      applyAlignToBlock(block, align);
    }

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
        <ToolbarButton title="Alinhar à esquerda" onClick={() => applyTextAlign("left")}>
          Esq
        </ToolbarButton>
        <ToolbarButton title="Centralizar" onClick={() => applyTextAlign("center")}>
          Centro
        </ToolbarButton>
        <ToolbarButton title="Alinhar à direita" onClick={() => applyTextAlign("right")}>
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
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="sentences"
          lang="pt-BR"
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
