import { NextResponse } from "next/server";
import { createAdminApiClientOrError } from "@/lib/admin/create-admin-api-client";
import { verifyAdminApi } from "@/lib/admin/verify-admin-api";

type RouteContext = { params: Promise<{ editalId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await verifyAdminApi();
  if (auth.error) return auth.error;

  const { editalId } = await context.params;
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

  const { data, error } = await adminResult.admin
    .from("edital_attachments")
    .update({ is_published: true })
    .eq("edital_id", editalId)
    .eq("is_published", false)
    .select("id");

  if (error) {
    return NextResponse.json(
      { ok: false, message: "Não foi possível publicar os anexos." },
      { status: 500 },
    );
  }

  const publishedCount = data?.length ?? 0;

  return NextResponse.json({
    ok: true,
    message:
      publishedCount > 0
        ? `${publishedCount} anexo(s) publicado(s). Membros já podem baixar.`
        : "Nenhum anexo pendente para publicar.",
    publishedCount,
  });
}
