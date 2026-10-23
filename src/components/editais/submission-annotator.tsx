"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { MarkupSidebar, MarkupToolbar } from "@/components/editais/markup-sidebar";
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
      className="relative touch-none select-none overflow-hidden rounded-2xl border border-white/10 bg-black/40"
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
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

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

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const pdf = await pdfjs.getDocument({ url: previewUrl }).promise;
        setPdfPages(pdf.numPages);
      } catch {
        setPdfError("Não foi possível carregar o PDF para marcação.");
      }
    })();
  }, [previewUrl, viewerMode]);

  useEffect(() => {
    if (viewerMode !== "pdf" || pdfPages === 0) return;

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        const pdf = await pdfjs.getDocument({ url: previewUrl }).promise;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          const canvas = canvasRefs.current.get(pageNumber);
          if (!canvas) continue;

          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.35 });
          const context = canvas.getContext("2d");
          if (!context) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: context, viewport, canvas }).promise;
        }
      } catch {
        setPdfError("Não foi possível renderizar o PDF.");
      }
    })();
  }, [previewUrl, viewerMode, pdfPages]);

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
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{memberName}</p>
            <p className="mt-0.5 text-xs font-medium text-muted">Tema</p>
            <p className="text-sm font-semibold leading-snug text-foreground">{phaseTitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MarkupToolbar
              color={color}
              pending={pending}
              onColorChange={setColor}
              onSave={saveMarkups}
            />
            <Link
              href={`/painel/correcoes/${submissionId}`}
              className="btn-secondary h-9 px-4 text-xs font-medium"
            >
              Voltar para correção
            </Link>
          </div>
        </div>
        {showPhaseDescription ? (
          <div className="mx-auto mt-3 max-w-6xl rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <p className="text-xs font-medium text-muted">Descrição do tema</p>
            <PhaseDescriptionContent
              html={phaseDescription}
              className="mt-1.5 max-h-40 overflow-y-auto pr-1 text-xs leading-5"
            />
          </div>
        ) : null}
        <p className="mx-auto mt-2 max-w-6xl text-xs text-muted">
          {viewerMode === "pdf"
            ? "Documento convertido em PDF para correção. Arraste para grifar em cada página."
            : "Arraste sobre a redação para grifar. Ao soltar, descreva o erro no painel à direita."}
        </p>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          {viewerMode === "image" ? (
            <MarkupOverlay page={1} {...overlayProps}>
              <img
                src={previewUrl}
                alt="Envio do aluno"
                className="block h-auto w-full pointer-events-none"
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
                    <canvas
                      ref={(node) => {
                        if (node) canvasRefs.current.set(page, node);
                      }}
                      className="block h-auto w-full"
                    />
                  </MarkupOverlay>
                </div>
              );
            })
          )}
        </div>

        <MarkupSidebar
          annotations={annotations}
          activeId={activeId}
          loaded={loaded}
          color={color}
          pending={pending}
          error={error}
          message={message}
          onColorChange={setColor}
          onSave={saveMarkups}
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
  );
}
