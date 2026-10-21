import "server-only";

import type { EditalAdminDraftPatch, EditalAdminDraftRow } from "@/lib/editais/edital-admin-draft";
import { mapEditalAdminDraft } from "@/lib/editais/edital-admin-draft";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function loadEditalAdminDraft(admin: AdminClient, editalId: string) {
  const { data } = await admin
    .from("edital_admin_drafts")
    .select("edital_id, published_revision, structure, evaluation_rubric, updated_at, updated_by")
    .eq("edital_id", editalId)
    .maybeSingle();

  if (!data) return null;
  return mapEditalAdminDraft(data as EditalAdminDraftRow);
}

export async function upsertEditalAdminDraft(
  admin: AdminClient,
  editalId: string,
  editorId: string,
  patch: EditalAdminDraftPatch,
) {
  const { data: existing } = await admin
    .from("edital_admin_drafts")
    .select("structure, evaluation_rubric")
    .eq("edital_id", editalId)
    .maybeSingle();

  const structure =
    patch.structure !== undefined ? patch.structure : (existing?.structure ?? null);
  const evaluationRubric =
    patch.evaluationRubric !== undefined
      ? patch.evaluationRubric
      : (existing?.evaluation_rubric ?? null);

  if (!structure && !evaluationRubric) {
    await admin.from("edital_admin_drafts").delete().eq("edital_id", editalId);
    return { ok: true as const };
  }

  const { error } = await admin.from("edital_admin_drafts").upsert(
    {
      edital_id: editalId,
      published_revision: patch.publishedRevision,
      structure,
      evaluation_rubric: evaluationRubric,
      updated_at: new Date().toISOString(),
      updated_by: editorId,
    },
    { onConflict: "edital_id" },
  );

  if (error) {
    return { ok: false as const, message: "Não foi possível salvar o rascunho." };
  }

  return { ok: true as const };
}

export async function clearEditalAdminDraftSection(
  admin: AdminClient,
  editalId: string,
  section: "structure" | "evaluationRubric" | "all",
) {
  if (section === "all") {
    await admin.from("edital_admin_drafts").delete().eq("edital_id", editalId);
    return;
  }

  const column = section === "structure" ? "structure" : "evaluation_rubric";
  const { data: existing } = await admin
    .from("edital_admin_drafts")
    .select("structure, evaluation_rubric, published_revision")
    .eq("edital_id", editalId)
    .maybeSingle();

  if (!existing) return;

  const nextStructure = section === "structure" ? null : existing.structure;
  const nextRubric = section === "evaluationRubric" ? null : existing.evaluation_rubric;

  if (!nextStructure && !nextRubric) {
    await admin.from("edital_admin_drafts").delete().eq("edital_id", editalId);
    return;
  }

  await admin
    .from("edital_admin_drafts")
    .update({
      structure: nextStructure,
      evaluation_rubric: nextRubric,
      updated_at: new Date().toISOString(),
    })
    .eq("edital_id", editalId);
}
