import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/painel";

  if (!code) {
    return NextResponse.redirect(new URL("/login?erro=link-invalido", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?erro=link-expirado", requestUrl.origin));
  }

  const safeNext = next.startsWith("/") ? next : "/painel";
  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
}
