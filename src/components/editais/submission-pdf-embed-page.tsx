"use client";

type SubmissionPdfEmbedPageProps = {
  /** URL same-origin do preview (ex.: /api/submissions/[id]/preview?source=original). */
  previewUrl: string;
  page: number;
  title: string;
};

/** Exibe o PDF original via visualizador nativo do navegador (iframe same-origin, compatível com CSP). */
export function SubmissionPdfEmbedPage({ previewUrl, page, title }: SubmissionPdfEmbedPageProps) {
  const hash = `#page=${page}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`;

  return (
    <iframe
      src={`${previewUrl}${hash}`}
      title={title}
      className="pointer-events-none block aspect-[210/297] w-full max-w-none border-0 bg-white"
    />
  );
}
