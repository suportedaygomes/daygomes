import { NextResponse } from "next/server";
import { getR2ObjectStream } from "@/lib/r2/storage";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("support_tickets")
    .select("member_id, attachment_path, attachment_mime")
    .eq("id", id)
    .maybeSingle();

  if (!ticket?.attachment_path) {
    return NextResponse.json({ error: "Anexo não encontrado." }, { status: 404 });
  }

  const isStaff = profile.role === "corretor" || profile.role === "admin";
  const isOwner = ticket.member_id === user.id;

  if (!isStaff && !isOwner) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const object = await getR2ObjectStream(ticket.attachment_path);
  if (!object.ok) {
    return NextResponse.json({ error: "Arquivo indisponível." }, { status: 404 });
  }

  return new NextResponse(object.body.transformToWebStream(), {
    headers: {
      "Content-Type": ticket.attachment_mime ?? object.contentType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
