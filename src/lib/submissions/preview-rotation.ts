import { normalizeImageRotation } from "@/lib/markup/image-rotation";
import type { SupabaseClient } from "@supabase/supabase-js";

export function isRotatablePreview(
  mimeType: string | null,
  previewPath: string,
): boolean {
  if (mimeType?.startsWith("image/")) return true;
  if (mimeType === "application/pdf") return true;
  if (previewPath.toLowerCase().endsWith(".pdf")) return true;
  return false;
}

export async function resolveSubmissionPreviewRotation(
  supabase: SupabaseClient,
  submissionId: string,
  url: URL,
  rotatable: boolean,
): Promise<ReturnType<typeof normalizeImageRotation>> {
  if (!rotatable) return 0;
  if (url.searchParams.has("r")) {
    return normalizeImageRotation(url.searchParams.get("r"));
  }
  const { data: markup } = await supabase
    .from("submission_markups")
    .select("image_rotation")
    .eq("submission_id", submissionId)
    .maybeSingle();
  return normalizeImageRotation(markup?.image_rotation);
}