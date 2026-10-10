import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, banned")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.banned) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { data: submission } = await supabase
    .from("phase_submissions")
    .select("id, member_id, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!submission) {
    return NextResponse.json({ error: "Envio não encontrado." }, { status: 404 });
  }

  const canAccess =
    submission.member_id === user.id ||
    profile.role === "corretor" ||
    profile.role === "admin";

  if (!canAccess) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { data, error } = await supabase.storage
    .from("submissions")
    .createSignedUrl(submission.storage_path, 120);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Arquivo indisponível." }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}
