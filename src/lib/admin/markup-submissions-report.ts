import "server-only";

import { unwrapSingle } from "@/lib/corrector/submission-row-utils";
import { createAdminClient } from "@/lib/supabase/admin";

export type MarkupSubmissionRow = {
  submissionId: string;
  memberName: string;
  status: string;
  mimeType: string | null;
  fileKind: "imagem" | "pdf" | "outro";
  originalFilename: string | null;
  fileSizeKb: number | null;
  markupCount: number;
  imageRotation: number;
  submittedAt: string;
  markupUpdatedAt: string;
  phaseTitle: string;
  editalTitle: string;
  highActivity: boolean;
};

function fileKindFromMime(mime: string | null): MarkupSubmissionRow["fileKind"] {
  if (mime?.startsWith("image/")) return "imagem";
  if (mime === "application/pdf") return "pdf";
  return "outro";
}

function parseMarkupCount(annotations: unknown): number {
  return Array.isArray(annotations) ? annotations.length : 0;
}

export async function loadMarkupSubmissionsReport(limit = 80): Promise<MarkupSubmissionRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("submission_markups")
    .select(
      `submission_id, image_rotation, updated_at, annotations,
      phase_submissions!inner(
        id, status, mime_type, original_filename, file_size, submitted_at,
        profiles!phase_submissions_member_id_fkey(full_name),
        edital_phases(title, phase_number, edital_cargos(editais(title)))
      )`,
    )
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[markup-submissions-report]", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const submission = unwrapSingle(
      (row as { phase_submissions?: unknown }).phase_submissions,
    ) as {
      status: string;
      mime_type: string | null;
      original_filename: string | null;
      file_size: number | null;
      submitted_at: string;
      profiles?: { full_name: string | null } | { full_name: string | null }[];
      edital_phases?:
        | {
            title: string | null;
            phase_number: number;
            edital_cargos?: { editais?: { title: string | null } | { title: string | null }[] };
          }
        | Array<{
            title: string | null;
            phase_number: number;
            edital_cargos?: { editais?: { title: string | null } | { title: string | null }[] };
          }>;
    } | null;

    const profile = unwrapSingle(submission?.profiles);
    const phase = unwrapSingle(submission?.edital_phases);
    const cargo = unwrapSingle(phase?.edital_cargos);
    const edital = unwrapSingle(cargo?.editais);

    const markupCount = parseMarkupCount((row as { annotations?: unknown }).annotations);
    const mimeType = submission?.mime_type ?? null;
    const fileKind = fileKindFromMime(mimeType);

    return {
      submissionId: row.submission_id as string,
      memberName: profile?.full_name?.trim() || "Membro",
      status: submission?.status ?? "—",
      mimeType,
      fileKind,
      originalFilename: submission?.original_filename ?? null,
      fileSizeKb:
        submission?.file_size != null ? Math.round(submission.file_size / 1024) : null,
      markupCount,
      imageRotation: Number((row as { image_rotation?: number }).image_rotation) || 0,
      submittedAt: submission?.submitted_at ?? "",
      markupUpdatedAt: (row as { updated_at: string }).updated_at,
      phaseTitle: phase?.title?.trim() || `Tema ${phase?.phase_number ?? "?"}`,
      editalTitle: edital?.title?.trim() || "Edital",
      highActivity: markupCount >= 8 || (fileKind === "pdf" && markupCount >= 5),
    };
  });
}