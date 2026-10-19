import { NextResponse } from "next/server";
import { createAdminApiClientOrError } from "@/lib/admin/create-admin-api-client";
import { verifyAdminApi } from "@/lib/admin/verify-admin-api";
import type { EditalEvaluationRubric } from "@/lib/editais/evaluation-rubric";
import { updateEditalEvaluationRubricCore } from "@/lib/editais/update-evaluation-rubric-core";

type RouteContext = { params: Promise<{ editalId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await verifyAdminApi();
    if (auth.error) return auth.error;

    const { editalId } = await context.params;
    const body = (await request.json().catch(() => null)) as {
      rubric?: EditalEvaluationRubric;
    } | null;

    if (!body?.rubric) {
      return NextResponse.json(
        { ok: false, message: "Informe os quesitos avaliativos." },
        { status: 400 },
      );
    }

    const adminResult = createAdminApiClientOrError();
    if (adminResult.error) return adminResult.error;

    const result = await updateEditalEvaluationRubricCore(
      adminResult.admin,
      editalId,
      body.rubric,
    );

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[admin/editais/evaluation-rubric] unexpected", error);
    return NextResponse.json(
      { ok: false, message: "Não foi possível salvar os quesitos." },
      { status: 500 },
    );
  }
}
