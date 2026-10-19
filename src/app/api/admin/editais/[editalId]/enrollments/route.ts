import { NextResponse } from "next/server";
import { enrollMemberInEditalCore } from "@/lib/editais/enroll-member-in-edital";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ editalId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { editalId } = await context.params;
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

    const body = (await request.json().catch(() => null)) as {
      memberId?: string;
      correctionQuota?: number;
    } | null;

    const memberId = typeof body?.memberId === "string" ? body.memberId.trim() : "";
    const correctionQuota = Number(body?.correctionQuota);

    if (!memberId) {
      return NextResponse.json(
        { ok: false, message: "Selecione um membro válido." },
        { status: 400 },
      );
    }

    let admin;
    try {
      admin = createAdminClient();
    } catch (error) {
      console.error("[enrollments] admin client", error);
      return NextResponse.json(
        {
          ok: false,
          message: "Servidor sem credencial de administração. Contate o suporte técnico.",
        },
        { status: 503 },
      );
    }

    const result = await enrollMemberInEditalCore(admin, {
      memberId,
      editalId,
      correctionQuota,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[enrollments] unexpected", error);
    return NextResponse.json(
      { ok: false, message: "Não foi possível vincular o membro. Tente novamente." },
      { status: 500 },
    );
  }
}
