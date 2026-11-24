import { isImageSubmission } from "@/lib/submissions/access";

type SubmissionPreviewPaths = {
  mime_type: string | null;
  storage_path: string;
  preview_storage_path: string | null;
};

export function staffMarkupPreviewUrls(
  submissionId: string,
  submission: SubmissionPreviewPaths,
): { primary: string; fallback?: string } {
  const base = `/api/submissions/${submissionId}/preview`;

  if (isImageSubmission(submission.mime_type) || submission.mime_type === "application/pdf") {
    return { primary: `${base}?source=original` };
  }

  if (submission.preview_storage_path) {
    return {
      primary: base,
      fallback: `${base}?source=original`,
    };
  }

  return { primary: `${base}?source=original` };
}