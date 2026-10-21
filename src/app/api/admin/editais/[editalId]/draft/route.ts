import { NextResponse } from "next/server";
import { createAdminApiClientOrError } from "@/lib/admin/create-admin-api-client";
import { verifyAdminApi } from "@/lib/admin/verify-admin-api";
import type { EditalAdminDraftPatch } from "@/lib/editais/edital-admin-draft";
import {
  clearEditalAdminDraftSection,
  loadEditalAdminDraft,
  upsertEditalAdminDraft,
} from "@/lib/editais/edital-admin-draft-server";

type RouteContext = { params: Promise<{ editalId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await verifyAdminApi();
  if (auth.error) return auth.error;

  const { editalId } = await context.params;
  const adminResult = createAdminApiClientOrError();
  if (adminResult.error) return adminResult.error;

  const draft = await loadEditalAdminDraft(adminResult.admin, editalId);
  return NextResponse.json({ ok: true, draft });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await verifyAdminApi();
  if (auth.error) return auth.error;

  const { editalId } = await context.params;
  const body = (await request.json().catch(() => null)) as EditalAdminDraftPatch | null;

  if (!body || typeof body.publishedRevision !== "string") {
    return NextResponse.json({ ok: false, message: "Rascunho inválido." }, { status: 400 });
  }

  const adminResult = createAdminApiClientOrError();
  if (adminResult.error) return adminResult.error;

  const { data: edital } = await adminResult.admin
    .from("editais")
    .select("id")
    .eq("id", editalId)
    .maybeSingle();

  if (!edital) {
    return NextResponse.json({ ok: false, message: "Edital não encontrado." }, { status: 404 });
  }

  const result = await upsertEditalAdminDraft(
    adminResult.admin,
    editalId,
    auth.user.id,
    body,
  );

  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }

  const draft = await loadEditalAdminDraft(adminResult.admin, editalId);
  return NextResponse.json({ ok: true, draft });
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await verifyAdminApi();
  if (auth.error) return auth.error;

  const { editalId } = await context.params;
  const section = new URL(request.url).searchParams.get("section");

  const adminResult = createAdminApiClientOrError();
  if (adminResult.error) return adminResult.error;

  if (section === "structure" || section === "evaluationRubric" || section === "all") {
    await clearEditalAdminDraftSection(
      adminResult.admin,
      editalId,
      section === "all" ? "all" : section,
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, message: "Seção inválida." }, { status: 400 });
}
