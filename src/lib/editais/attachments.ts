import "server-only";

import type { UserRole } from "@/lib/roles";
import {
  mapEditalAttachment,
  type EditalAttachmentRow,
  type EditalAttachmentView,
} from "@/lib/editais/attachments-shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export {
  EDITAL_ATTACHMENT_MAX_BYTES,
  editalAttachmentDownloadPath,
  fileExtensionFromName,
  formatAttachmentSize,
  mapEditalAttachment,
  type EditalAttachmentRow,
  type EditalAttachmentView,
} from "@/lib/editais/attachments-shared";

export async function listEditalAttachments(editalId: string): Promise<EditalAttachmentView[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("edital_attachments")
    .select(
      "id, edital_id, title, description, storage_path, original_filename, mime_type, file_size, sort_order, created_at",
    )
    .eq("edital_id", editalId)
    .order("sort_order")
    .order("created_at");

  return (data ?? []).map((row) => mapEditalAttachment(row as EditalAttachmentRow));
}

export async function listEditalAttachmentsByEditalIds(
  editalIds: string[],
): Promise<Map<string, EditalAttachmentView[]>> {
  const map = new Map<string, EditalAttachmentView[]>();
  if (!editalIds.length) return map;

  const admin = createAdminClient();
  const { data } = await admin
    .from("edital_attachments")
    .select(
      "id, edital_id, title, description, storage_path, original_filename, mime_type, file_size, sort_order, created_at",
    )
    .in("edital_id", editalIds)
    .order("sort_order")
    .order("created_at");

  for (const row of data ?? []) {
    const typed = row as EditalAttachmentRow;
    const list = map.get(typed.edital_id) ?? [];
    list.push(mapEditalAttachment(typed));
    map.set(typed.edital_id, list);
  }

  return map;
}

export async function userCanAccessEditalAttachments(
  userId: string,
  role: UserRole,
  editalId: string,
): Promise<boolean> {
  if (role === "admin" || role === "corretor") {
    return true;
  }

  if (role !== "membro") {
    return false;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("member_edital_enrollments")
    .select("id")
    .eq("member_id", userId)
    .eq("edital_id", editalId)
    .maybeSingle();

  return Boolean(data);
}

export async function resolveEditalIdForSubmission(submissionId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: submission } = await admin
    .from("phase_submissions")
    .select("enrollment_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission?.enrollment_id) return null;

  const { data: enrollment } = await admin
    .from("member_edital_enrollments")
    .select("edital_id")
    .eq("id", submission.enrollment_id)
    .maybeSingle();

  return enrollment?.edital_id ?? null;
}
