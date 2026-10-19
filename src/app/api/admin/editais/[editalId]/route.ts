import { NextResponse } from "next/server";
import { createAdminApiClientOrError } from "@/lib/admin/create-admin-api-client";
import { verifyAdminApi } from "@/lib/admin/verify-admin-api";
import type { CargoEditInput } from "@/lib/editais/types";
import { updateEditalCore } from "@/lib/editais/update-edital-core";

type RouteContext = { params: Promise<{ editalId: string }> };

export const runtime = "nodejs";
export const maxDuration = 60;

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await verifyAdminApi();
    if (auth.error) return auth.error;

    const { editalId } = await context.params;
    const body = (await request.json().catch(() => null)) as {
      title?: string;
      submissionPeriodDays?: number;
      defaultCorrectionQuota?: number;
      cargos?: CargoEditInput[];
    } | null;

    if (!body || typeof body.title !== "string" || !Array.isArray(body.cargos)) {
      return NextResponse.json(
        { ok: false, message: "Dados do edital inválidos." },
        { status: 400 },
      );
    }

    const adminResult = createAdminApiClientOrError();
    if (adminResult.error) return adminResult.error;

    const result = await updateEditalCore(adminResult.admin, {
      editalId,
      title: body.title,
      submissionPeriodDays: Number(body.submissionPeriodDays),
      defaultCorrectionQuota: Number(body.defaultCorrectionQuota),
      cargos: body.cargos,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[admin/editais] PATCH unexpected", error);
    const detail = error instanceof Error ? error.message : String(error);
    if (/body exceeded|too large|payload/i.test(detail)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "O edital é grande demais para enviar de uma vez. Reduza textos longos nos temas ou salve em partes menores.",
        },
        { status: 413 },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        message:
          detail || "Erro inesperado ao salvar o edital. Tente novamente em instantes.",
      },
      { status: 500 },
    );
  }
}
