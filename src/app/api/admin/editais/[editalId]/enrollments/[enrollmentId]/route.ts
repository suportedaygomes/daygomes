import { NextResponse } from "next/server";
import { unenrollMemberFromEditalCore } from "@/lib/editais/unenroll-member-from-edital";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ editalId: string; enrollmentId: string }> };

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { editalId, enrollmentId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, banned")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.banned || profile.role !== "admin") {
      return NextResponse.json({ ok: false, message: "Acesso negado." }, { status: 403 });
    }

    let admin;
    try {
      admin = createAdminClient();
    } catch (error) {
      console.error("[enrollments:delete] admin client", error);
      return NextResponse.json(
        {
          ok: false,
          message: "Servidor sem credencial de administração. Contate o suporte técnico.",
        },
        { status: 503 },
      );
    }

    const result = await unenrollMemberFromEditalCore(admin, { editalId, enrollmentId });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[enrollments:delete] unexpected", error);
    return NextResponse.json(
      { ok: false, message: "Não foi possível desvincular o membro. Tente novamente." },
      { status: 500 },
    );
  }
}
