import { NextResponse } from "next/server";
import { getR2ObjectStream } from "@/lib/r2/storage";
import { getAvatarPublicUrl } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const key = new URL(request.url).searchParams.get("key")?.trim();
  if (!key) {
    return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  const ownsAvatar =
    key.startsWith(`avatars/${user.id}/`) || profile?.avatar_path === key;

  if (!ownsAvatar) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  if (key.startsWith("avatars/")) {
    const object = await getR2ObjectStream(key);
    if (!object.ok) {
      return NextResponse.json({ error: object.error }, { status: 404 });
    }

    const body = object.body.transformToWebStream();
    return new NextResponse(body, {
      headers: {
        "Content-Type": object.contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const { url } = getSupabasePublicEnv();
  const legacyUrl = getAvatarPublicUrl(url, key);
  if (!legacyUrl || legacyUrl.includes("/api/files/avatar")) {
    return NextResponse.json({ error: "Arquivo indisponível." }, { status: 404 });
  }

  return NextResponse.redirect(legacyUrl);
}
