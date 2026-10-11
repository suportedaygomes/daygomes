"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MARKUP_COLORS,
  type MarkupAnnotation,
  markupColorRgba,
} from "@/lib/markup/types";

type NumberedAnnotation = MarkupAnnotation & { number: number };

type SubmissionMarkupViewerProps = {
  previewUrl: string;
  viewerMode: "image" | "pdf";
  annotations: MarkupAnnotation[];
};

function scrollToMarkup(id: string) {
  document.getElementById(`markup-${id}`)?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

function MarkupDetailPanel({
  item,
  onClose,
}: {
  item: NumberedAnnotation;
  onClose: () => void;
}) {
  const colorLabel =
    MARKUP_COLORS.find((c) => c.id === item.color)?.label ?? "Marcação";

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-field/95 p-4 shadow-2xl backdrop-blur-md print:hidden sm:mx-auto sm:mb-4 sm:max-w-lg sm:rounded-2xl sm:border sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
      role="dialog"
      aria-labelledby={`markup-detail-title-${item.id}`}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple text-sm font-bold text-white"
              aria-hidden
            >
              {item.number}
            </span>
            <div>
              <p id={`markup-detail-title-${item.id}`} className="font-semibold">
                Erro {item.number}
                {item.page > 1 ? ` · página ${item.page}` : ""}
              </p>
              <p className="text-xs text-muted">{colorLabel}</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-secondary px-3 py-1 text-sm"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
        <p className="text-sm leading-6 text-muted">
          {item.note.trim() || "O corretor não descreveu este ponto."}
        </p>
      </div>
    </div>
  );
}

function ReadonlyOverlay({
  page,
  annotations,
  activeId,
  onSelect,
  children,
}: {
  page: number;
  annotations: NumberedAnnotation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  children: React.ReactNode;
}) {
  const pageAnnotations = annotations.filter((item) => (item.page || 1) === page);

  return (
    <div className="relative overflow-visible rounded-2xl border border-white/10 bg-black/40">
      <div className="overflow-hidden rounded-2xl">{children}</div>
      {pageAnnotations.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            id={`markup-${item.id}`}
            className={`absolute border-2 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-purple ${
              isActive
                ? "border-white ring-2 ring-purple ring-offset-2 ring-offset-black/50"
                : "border-white/40 hover:border-white/70"
            }`}
            style={{
              left: `${item.x * 100}%`,
              top: `${item.y * 100}%`,
              width: `${item.width * 100}%`,
              height: `${item.height * 100}%`,
              backgroundColor: markupColorRgba(item.color),
            }}
            onClick={() => onSelect(item.id)}
            aria-label={`Erro ${item.number}. Toque para ver o comentário.`}
            aria-pressed={isActive}
          >
            <span
              className="pointer-events-none absolute left-0 top-0 z-10 flex h-4 min-w-4 -translate-y-[calc(100%+3px)] items-center justify-center rounded-full bg-purple px-0.5 text-[10px] font-semibold leading-none text-white shadow-sm ring-1 ring-black/25"
              aria-hidden
            >
              {item.number}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SubmissionMarkupViewer({
  previewUrl,
  viewerMode,
  annotations,
}: SubmissionMarkupViewerProps) {
  const [pdfPages, setPdfPages] = useState(0);
  const [pdfError, setPdfError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  const numbered = useMemo(
    () =>
      annotations.map((item, index) => ({
        ...item,
        number: index + 1,
        page: item.page && item.page > 0 ? item.page : 1,
      })),
    [annotations],
  );

  const activeItem = numbered.find((item) => item.id === activeId) ?? null;

  function selectMarkup(id: string) {
    setActiveId(id);
    requestAnimationFrame(() => scrollToMarkup(id));
  }

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
        setPdfError("Não foi possível carregar o PDF corrigido.");
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

  return (
    <div className={`flex flex-col gap-6 ${activeItem ? "pb-36 sm:pb-40" : ""}`}>
      {numbered.length > 0 ? (
        <p className="text-sm text-muted print:hidden">
          Cada destaque no texto tem um número. Toque ou clique nele para ver por que foi
          marcado, sem precisar rolar até o final da página.
        </p>
      ) : null}

      <div id="correcao-imprimivel" className="flex flex-col gap-6">
        {viewerMode === "image" ? (
          <ReadonlyOverlay
            page={1}
            annotations={numbered}
            activeId={activeId}
            onSelect={selectMarkup}
          >
            <img
              src={previewUrl}
              alt="Sua atividade corrigida"
              className="block h-auto w-full"
            />
          </ReadonlyOverlay>
        ) : pdfError ? (
          <p className="alert-error">{pdfError}</p>
        ) : pdfPages === 0 ? (
          <p className="text-sm text-muted">Carregando documento...</p>
        ) : (
          Array.from({ length: pdfPages }, (_, index) => {
            const page = index + 1;
            return (
              <div key={page}>
                <p className="mb-2 text-xs font-semibold text-muted">Página {page}</p>
                <ReadonlyOverlay
                  page={page}
                  annotations={numbered}
                  activeId={activeId}
                  onSelect={selectMarkup}
                >
                  <canvas
                    ref={(node) => {
                      if (node) canvasRefs.current.set(page, node);
                    }}
                    className="block h-auto w-full"
                  />
                </ReadonlyOverlay>
              </div>
            );
          })
        )}
      </div>

      {numbered.length > 0 ? (
        <section className="panel-card print:break-before-page">
          <h2 className="text-lg font-semibold">Índice de erros</h2>
          <p className="mt-1 text-sm text-muted print:hidden">
            Você também pode abrir um erro pela lista abaixo.
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {numbered.map((item) => {
              const colorLabel =
                MARKUP_COLORS.find((c) => c.id === item.color)?.label ?? "Marcação";
              const isActive = activeId === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`w-full rounded-xl border p-3 text-left text-sm transition-colors print:border-white/10 print:bg-field/50 ${
                      isActive
                        ? "border-purple/50 bg-purple/15"
                        : "border-white/10 bg-field/50 hover:border-white/20"
                    }`}
                    onClick={() => selectMarkup(item.id)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple text-xs font-bold text-white"
                        aria-hidden
                      >
                        {item.number}
                      </span>
                      <span
                        className="inline-block h-3 w-8 rounded-sm"
                        style={{ backgroundColor: markupColorRgba(item.color) }}
                        aria-hidden
                      />
                      <span className="font-medium">
                        Erro {item.number}
                        {item.page > 1 ? ` · página ${item.page}` : ""}
                      </span>
                      <span className="text-xs text-muted">({colorLabel})</span>
                    </div>
                    <p className="mt-2 text-muted">
                      {item.note.trim() || "Sem descrição informada."}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-muted">
          O corretor não registrou marcações visuais neste envio.
        </p>
      )}

      {activeItem ? (
        <MarkupDetailPanel item={activeItem} onClose={() => setActiveId(null)} />
      ) : null}
    </div>
  );
}
