import { NextResponse } from "next/server";
import { getR2ObjectStream } from "@/lib/r2/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ replyId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { replyId } = await context.params;
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
  const { data: reply } = await admin
    .from("support_ticket_replies")
    .select("attachment_path, attachment_mime, ticket_id, support_tickets(member_id)")
    .eq("id", replyId)
    .maybeSingle();

  if (!reply?.attachment_path) {
    return NextResponse.json({ error: "Anexo não encontrado." }, { status: 404 });
  }

  const ticket = Array.isArray(reply.support_tickets)
    ? reply.support_tickets[0]
    : reply.support_tickets;

  const isStaff = profile.role === "corretor" || profile.role === "admin";
  const isOwner = ticket?.member_id === user.id;

  if (!isStaff && !isOwner) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const object = await getR2ObjectStream(reply.attachment_path);
  if (!object.ok) {
    return NextResponse.json({ error: "Arquivo indisponível." }, { status: 404 });
  }

  return new NextResponse(object.body.transformToWebStream(), {
    headers: {
      "Content-Type": reply.attachment_mime ?? object.contentType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
