import { NextResponse } from "next/server";
import { avatarObjectKey, deleteR2Object, putR2Object } from "@/lib/r2/storage";
import { isR2Configured } from "@/lib/r2/config";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  if (!isR2Configured()) {
    return NextResponse.json({ error: "Armazenamento não configurado." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Use JPG, PNG ou WebP." }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "A imagem deve ter até 2 MB." }, { status: 400 });
  }

  const extension =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const key = avatarObjectKey(user.id, extension);
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  const upload = await putR2Object({
    key,
    body: buffer,
    contentType: file.type,
  });

  if (!upload.ok) {
    return NextResponse.json({ error: "Não foi possível enviar a foto." }, { status: 500 });
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_path: key, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (profileError) {
    await deleteR2Object(key);
    return NextResponse.json({ error: "Foto enviada, mas o perfil não foi atualizado." }, { status: 500 });
  }

  const previousKey = profile?.avatar_path;
  if (previousKey && previousKey.startsWith("avatars/") && previousKey !== key) {
    await deleteR2Object(previousKey).catch(() => undefined);
  }

  const avatarUrl = `/api/files/avatar?key=${encodeURIComponent(key)}`;
  return NextResponse.json({ ok: true, avatarUrl, key });
}
