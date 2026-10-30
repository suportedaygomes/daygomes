"use client";

type SubmissionPdfEmbedPageProps = {
  blobUrl: string;
  page: number;
  title: string;
};

/** Exibe o PDF original via visualizador nativo do navegador (sem rasterizar com pdf.js). */
export function SubmissionPdfEmbedPage({ blobUrl, page, title }: SubmissionPdfEmbedPageProps) {
  const hash = `#page=${page}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`;

  return (
    <iframe
      src={`${blobUrl}${hash}`}
      title={title}
      className="pointer-events-none block aspect-[210/297] w-full max-w-none border-0 bg-white"
    />
  );
}
