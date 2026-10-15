import { NextResponse } from "next/server";
import { userCanAccessEditalAttachments } from "@/lib/editais/attachments";
import { getR2ObjectStream } from "@/lib/r2/storage";
import type { UserRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ editalId: string; attachmentId: string }> };

export async function GET(_request: Request, context: RouteContext) {
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

  if (!profile || profile.banned) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const allowed = await userCanAccessEditalAttachments(
    user.id,
    profile.role as UserRole,
    editalId,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: attachment } = await admin
    .from("edital_attachments")
    .select("storage_path, original_filename, mime_type")
    .eq("id", attachmentId)
    .eq("edital_id", editalId)
    .maybeSingle();

  if (!attachment?.storage_path) {
    return NextResponse.json({ error: "Anexo não encontrado." }, { status: 404 });
  }

  const object = await getR2ObjectStream(attachment.storage_path);
  if (!object.ok) {
    return NextResponse.json({ error: "Arquivo indisponível." }, { status: 404 });
  }

  const filename = attachment.original_filename.replace(/[^\w.\- ()áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/g, "_");

  return new NextResponse(object.body.transformToWebStream(), {
    headers: {
      "Content-Type": attachment.mime_type ?? object.contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
