import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  EDITAL_ATTACHMENT_MAX_BYTES,
  fileExtensionFromName,
} from "@/lib/editais/attachments";
import { isR2Configured } from "@/lib/r2/config";
import { editalAttachmentKey, putR2Object } from "@/lib/r2/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ editalId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { editalId } = await context.params;
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

  if (!isR2Configured()) {
    return NextResponse.json({ error: "Armazenamento de arquivos indisponível." }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data: edital } = await admin.from("editais").select("id").eq("id", editalId).maybeSingle();
  if (!edital) {
    return NextResponse.json({ error: "Edital não encontrado." }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Selecione um arquivo." }, { status: 400 });
  }

  if (!title || title.length < 2) {
    return NextResponse.json({ error: "Informe o título do anexo." }, { status: 400 });
  }

  if (title.length > 160) {
    return NextResponse.json({ error: "Título muito longo." }, { status: 400 });
  }

  if (description.length > 2000) {
    return NextResponse.json({ error: "Descrição muito longa." }, { status: 400 });
  }

  if (file.size <= 0) {
    return NextResponse.json({ error: "Arquivo vazio." }, { status: 400 });
  }

  if (file.size > EDITAL_ATTACHMENT_MAX_BYTES) {
    return NextResponse.json(
      { error: "Arquivo muito grande (máximo 25 MB)." },
      { status: 400 },
    );
  }

  const attachmentId = randomUUID();
  const extension = fileExtensionFromName(file.name);
  const storagePath = editalAttachmentKey(editalId, attachmentId, extension);
  const buffer = Buffer.from(await file.arrayBuffer());

  const uploaded = await putR2Object({
    key: storagePath,
    body: buffer,
    contentType: file.type || "application/octet-stream",
  });

  if (!uploaded.ok) {
    return NextResponse.json({ error: uploaded.error }, { status: 500 });
  }

  const { count } = await admin
    .from("edital_attachments")
    .select("*", { count: "exact", head: true })
    .eq("edital_id", editalId);

  const { data: row, error } = await admin
    .from("edital_attachments")
    .insert({
      id: attachmentId,
      edital_id: editalId,
      title,
      description,
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: file.type || null,
      file_size: file.size,
      sort_order: count ?? 0,
    })
    .select("id, title")
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Não foi possível registrar o anexo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: row.id, title: row.title });
}
