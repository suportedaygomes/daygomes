import { NextResponse } from "next/server";
import { deleteR2Object } from "@/lib/r2/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ editalId: string; attachmentId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const { editalId, attachmentId } = await context.params;
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

  if (!profile || profile.banned || profile.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: attachment } = await admin
    .from("edital_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .eq("edital_id", editalId)
    .maybeSingle();

  if (!attachment) {
    return NextResponse.json({ error: "Anexo não encontrado." }, { status: 404 });
  }

  await admin.from("edital_attachments").delete().eq("id", attachmentId);
  if (attachment.storage_path) {
    await deleteR2Object(attachment.storage_path);
  }

  return NextResponse.json({ ok: true });
}
