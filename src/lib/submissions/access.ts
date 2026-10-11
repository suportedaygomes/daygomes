import { correctorMayAccessPendingSubmission } from "@/lib/corrector/submission-assignment";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getSubmissionForUser(
  supabase: SupabaseClient,
  submissionId: string,
  userId: string,
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, banned")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || profile.banned) {
    return { ok: false as const, status: 403, error: "Acesso negado." };
  }

  const { data: submission } = await supabase
    .from("phase_submissions")
    .select(
      "id, member_id, status, assigned_corrector_id, storage_path, preview_storage_path, mime_type, original_filename",
    )
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission) {
    return { ok: false as const, status: 404, error: "Envio não encontrado." };
  }

  if (submission.member_id === userId) {
    return { ok: true as const, submission, profile };
  }

  if (profile.role === "corretor" || profile.role === "admin") {
    if (
      correctorMayAccessPendingSubmission(
        submission,
        userId,
        profile.role as "corretor" | "admin",
      )
    ) {
      return { ok: true as const, submission, profile };
    }
    return {
      ok: false as const,
      status: 403,
      error: "Esta atividade está em correção com outro corretor.",
    };
  }

  return { ok: false as const, status: 403, error: "Acesso negado." };
}

export type SubmissionAccessResult = Awaited<ReturnType<typeof getSubmissionForUser>>;

export function isImageSubmission(mimeType: string | null) {
  return Boolean(mimeType?.startsWith("image/"));
}

export function getSubmissionPreviewPath(submission: {
  storage_path: string;
  preview_storage_path: string | null;
  mime_type: string | null;
}) {
  if (submission.preview_storage_path) {
    return submission.preview_storage_path;
  }
  if (submission.mime_type === "application/pdf" || isImageSubmission(submission.mime_type)) {
    return submission.storage_path;
  }
  return submission.preview_storage_path ?? submission.storage_path;
}

export function getAnnotatorViewerMode(submission: {
  storage_path: string;
  preview_storage_path: string | null;
  mime_type: string | null;
}): "image" | "pdf" {
  if (submission.preview_storage_path) return "pdf";
  if (submission.mime_type === "application/pdf") return "pdf";
  if (isImageSubmission(submission.mime_type)) return "image";
  return "pdf";
}
