"use client";

import { useEffect, useRef, useState } from "react";

type SubmissionPdfCanvasPageProps = {
  previewUrl: string;
  page: number;
  title: string;
};

/** Renderiza PDF com pdf.js (funciona no iOS; iframe costuma ficar em branco). */
export function SubmissionPdfCanvasPage({
  previewUrl,
  page,
  title,
}: SubmissionPdfCanvasPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    void (async () => {
      try {
        const response = await fetch(previewUrl, { credentials: "include" });
        if (!response.ok) {
          setError("Não foi possível carregar o documento para exibição.");
          return;
        }

        const blob = await response.blob();
        if (cancelled) return;

        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const pdf = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise;
        if (page < 1 || page > pdf.numPages) {
          setError("Página do documento indisponível.");
          return;
        }

        const pdfPage = await pdf.getPage(page);
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        const parentWidth = canvas.parentElement?.clientWidth ?? 640;
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const scale = Math.max(parentWidth / baseViewport.width, 0.25);
        const viewport = pdfPage.getViewport({ scale });

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setError("Não foi possível desenhar o documento.");
          return;
        }

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        await pdfPage.render({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;

        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Falha ao renderizar o PDF neste dispositivo.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, previewUrl]);

  if (error) {
    return <p className="alert-error text-sm">{error}</p>;
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-white">
      {loading ? (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">
          Carregando documento…
        </p>
      ) : null}
      <canvas
        ref={canvasRef}
        className="block h-auto w-full max-w-full"
        role="img"
        aria-label={title}
      />
    </div>
  );
}