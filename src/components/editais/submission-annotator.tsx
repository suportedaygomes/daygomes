"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type PointerEvent } from "react";
import { MarkupSidebar, MarkupToolbar } from "@/components/editais/markup-sidebar";
import { SubmissionPdfEmbedPage } from "@/components/editais/submission-pdf-embed-page";
import { PhaseDescriptionContent } from "@/components/editais/phase-description-content";
import { isPhaseDescriptionEmpty } from "@/lib/rich-text/phase-description-plain";
import {
  type MarkupAnnotation,
  type MarkupColorId,
  markupColorRgba,
} from "@/lib/markup/types";

type SubmissionAnnotatorProps = {
  submissionId: string;
  previewUrl: string;
  /** Quando o preview convertido falhar, tenta o arquivo original (ex.: PDF enviado pelo aluno). */
  fallbackPreviewUrl?: string;
  viewerMode: "image" | "pdf";
  memberName: string;
  phaseTitle: string;
  phaseDescription?: string;
};

type DragState = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function rectFromDrag(drag: DragState) {
  const x1 = Math.min(drag.startX, drag.currentX);
  const y1 = Math.min(drag.startY, drag.currentY);
  const x2 = Math.max(drag.startX, drag.currentX);
  const y2 = Math.max(drag.startY, drag.currentY);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

function MarkupOverlay({
  page,
  annotations,
  activeId,
  color,
  drag,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onSelect,
  children,
}: {
  page: number;
  annotations: MarkupAnnotation[];
  activeId: string | null;
  color: MarkupColorId;
  drag: DragState | null;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onSelect: (id: string) => void;
  children: React.ReactNode;
}) {
  const pageAnnotations = annotations.filter((item) => (item.page || 1) === page);
  const draft = drag ? rectFromDrag(drag) : null;

  return (
    <div
      className="relative touch-none select-none overflow-visible rounded-2xl border border-[color:var(--border-subtle)] bg-white"
      data-markup-page={page}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => undefined}
    >
      {children}
      {pageAnnotations.map((item) => (
        <button
          key={item.id}
          type="button"
          data-markup-hit
          className={`absolute border-2 transition ${
            activeId === item.id ? "border-white" : "border-transparent"
          }`}
          style={{
            left: `${item.x * 100}%`,
            top: `${item.y * 100}%`,
            width: `${item.width * 100}%`,
            height: `${item.height * 100}%`,
            backgroundColor: markupColorRgba(item.color),
          }}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(item.id);
          }}
        />
      ))}
      {draft ? (
        <div
          className="pointer-events-none absolute border-2 border-dashed border-white/80"
          style={{
            left: `${draft.x * 100}%`,
            top: `${draft.y * 100}%`,
            width: `${draft.width * 100}%`,
            height: `${draft.height * 100}%`,
            backgroundColor: markupColorRgba(color),
          }}
        />
      ) : null}
    </div>
  );
}

export function SubmissionAnnotator({
  submissionId,
  previewUrl,
  fallbackPreviewUrl,
  viewerMode,
  memberName,
  phaseTitle,
  phaseDescription = "",
}: SubmissionAnnotatorProps) {
  const showPhaseDescription = !isPhaseDescriptionEmpty(phaseDescription);
  const [color, setColor] = useState<MarkupColorId>("yellow");
  const [annotations, setAnnotations] = useState<MarkupAnnotation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pdfPages, setPdfPages] = useState(0);
  const [pdfError, setPdfError] = useState("");
  const [activePreviewUrl, setActivePreviewUrl] = useState(previewUrl);

  useEffect(() => {
    setActivePreviewUrl(previewUrl);
    setPdfPages(0);
    setPdfError("");
  }, [previewUrl]);

  useEffect(() => {
    void (async () => {
      const response = await fetch(`/api/submissions/${submissionId}/markups`);
      if (!response.ok) return;
      const data = (await response.json()) as { annotations?: MarkupAnnotation[] };
      setAnnotations(data.annotations ?? []);
      setLoaded(true);
    })();
  }, [submissionId]);

  useEffect(() => {
    if (viewerMode !== "pdf") return;

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(activePreviewUrl, { credentials: "include" });
        if (!response.ok) {
          if (
            fallbackPreviewUrl &&
            activePreviewUrl !== fallbackPreviewUrl &&
            (response.status === 404 || response.status === 403)
          ) {
            setActivePreviewUrl(fallbackPreviewUrl);
            return;
          }
          setPdfError(
            response.status === 403
              ? "Sem permissão para ver este PDF. Peça ao admin para devolver à fila ou abra a correção de novo."
              : "Não foi possível carregar o PDF para marcação.",
          );
          return;
        }

        const blob = await response.blob();
        if (cancelled) return;

        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const data = await blob.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data }).promise;
        if (pdf.numPages < 1) {
          setPdfError("O PDF deste envio está vazio.");
          return;
        }

        setPdfPages(pdf.numPages);
      } catch {
        if (cancelled) return;
        if (fallbackPreviewUrl && activePreviewUrl !== fallbackPreviewUrl) {
          setActivePreviewUrl(fallbackPreviewUrl);
          return;
        }
        setPdfError("Não foi possível carregar o PDF para marcação.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activePreviewUrl, fallbackPreviewUrl, viewerMode]);

  const relativePoint = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const page = Number(el.dataset.markupPage ?? "1");
    setActivePage(page);
    return {
      x: clamp01((event.clientX - rect.left) / rect.width),
      y: clamp01((event.clientY - rect.top) / rect.height),
      page,
    };
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-markup-hit]")) return;
    const point = relativePoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      startX: point.x,
      startY: point.y,
      currentX: point.x,
      currentY: point.y,
    });
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const point = relativePoint(event);
    if (!point) return;
    setDrag({ ...drag, currentX: point.x, currentY: point.y });
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const point = relativePoint(event);
    const finalDrag = point
      ? { ...drag, currentX: point.x, currentY: point.y }
      : drag;
    const box = rectFromDrag(finalDrag);
    setDrag(null);

    if (box.width < 0.008 || box.height < 0.008) return;

    const page = Number(event.currentTarget.dataset.markupPage ?? "1");
    const id = crypto.randomUUID();
    const next: MarkupAnnotation = {
      id,
      color,
      page,
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      note: "",
    };
    setAnnotations((current) => [...current, next]);
    setActiveId(id);
  }

  async function saveMarkups() {
    setError("");
    setMessage("");
    setPending(true);
    const response = await fetch(`/api/submissions/${submissionId}/markups`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ annotations }),
    });
    if (!response.ok) {
      setError("Não foi possível salvar as marcações.");
      setPending(false);
      return;
    }
    setMessage("As marcações foram salvas com sucesso.");
    setPending(false);
  }

  const overlayProps = {
    annotations,
    activeId,
    color,
    drag,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onSelect: setActiveId,
  };

  return (
    <div className="w-full rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-elevated)] shadow-sm">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[color:var(--border-subtle)] px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Correção</p>
          <p className="mt-0.5 truncate text-base font-semibold">{memberName}</p>
        </div>
        <Link
          href={`/painel/correcoes/${submissionId}`}
          prefetch={false}
          className="btn-secondary hidden h-9 shrink-0 px-4 text-xs font-medium sm:inline-flex"
        >
          Voltar para correção
        </Link>
      </header>

      <section className="shrink-0 border-b border-[color:var(--border-subtle)] bg-field/25 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Tema</p>
        <p className="mt-1 text-sm font-semibold leading-snug sm:text-base">{phaseTitle}</p>
        {showPhaseDescription ? (
          <details className="mt-2 group">
            <summary className="cursor-pointer text-xs font-medium text-purple marker:content-none [&::-webkit-details-marker]:hidden">
              Enunciado completo
            </summary>
            <div className="mt-2 pr-1">
              <PhaseDescriptionContent
                html={phaseDescription}
                className="text-xs leading-relaxed text-foreground/90 sm:text-sm [&_p]:mt-1.5 [&_p:first-child]:mt-0"
              />
            </div>
          </details>
        ) : null}
      </section>

      <div className="sticky top-0 z-20 border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-elevated)]/95 backdrop-blur-sm">
        <MarkupToolbar
          layout="strip"
          color={color}
          pending={pending}
          onColorChange={setColor}
          onSave={saveMarkups}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:items-start lg:gap-5 lg:p-4 lg:pt-3">
        <div className="min-w-0 border-[color:var(--border-subtle)] bg-field/30 p-2 sm:p-3 lg:rounded-xl lg:border">
          <div className="flex w-full min-w-0 flex-col gap-6">
            {viewerMode === "image" ? (
              <MarkupOverlay page={1} {...overlayProps}>
                <img
                  src={activePreviewUrl}
                  alt="Envio do aluno"
                  className="pointer-events-none block h-auto w-full max-w-full"
                  draggable={false}
                />
              </MarkupOverlay>
            ) : pdfError ? (
              <p className="alert-error">{pdfError}</p>
            ) : pdfPages === 0 ? (
              <p className="text-sm text-muted">Carregando PDF...</p>
            ) : (
              Array.from({ length: pdfPages }, (_, index) => {
                const page = index + 1;
                return (
                  <div key={page}>
                    <p className="mb-2 text-xs font-semibold text-muted">Página {page}</p>
                    <MarkupOverlay page={page} {...overlayProps}>
                      <SubmissionPdfEmbedPage
                        previewUrl={activePreviewUrl}
                        page={page}
                        title={`Redação enviada — página ${page}`}
                      />
                    </MarkupOverlay>
                  </div>
                );
              })
            )}
            </div>
        </div>

        <div className="border-t border-[color:var(--border-subtle)] bg-field/20 lg:sticky lg:top-[3.25rem] lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:rounded-xl lg:border lg:border-t lg:bg-field/30">
          <MarkupSidebar
            annotations={annotations}
            activeId={activeId}
            loaded={loaded}
            error={error}
            message={message}
            onNoteChange={(id, note) =>
              setAnnotations((current) =>
                current.map((item) => (item.id === id ? { ...item, note } : item)),
              )
            }
            onRemove={(id) => {
              setAnnotations((current) => current.filter((item) => item.id !== id));
              if (activeId === id) setActiveId(null);
            }}
            onFocus={setActiveId}
            correctionHref={`/painel/correcoes/${submissionId}`}
          />
        </div>
      </div>
    </div>
  );
}
