"use client";

import { SubmissionPdfCanvasPage } from "@/components/editais/submission-pdf-canvas-page";
import { SubmissionPdfEmbedPage } from "@/components/editais/submission-pdf-embed-page";
import { useMobilePdfRenderer } from "@/lib/submissions/use-mobile-pdf-renderer";

type Props = {
  previewUrl: string;
  page: number;
  title: string;
};

export function SubmissionPdfPage({ previewUrl, page, title }: Props) {
  const preferCanvas = useMobilePdfRenderer();
  if (preferCanvas) {
    return <SubmissionPdfCanvasPage previewUrl={previewUrl} page={page} title={title} />;
  }
  return <SubmissionPdfEmbedPage previewUrl={previewUrl} page={page} title={title} />;
}