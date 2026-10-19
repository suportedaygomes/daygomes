import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function verifyAdminApi() {
  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    console.error("[verifyAdminApi] createClient", error);
    return {
      error: NextResponse.json(
        { ok: false, message: "Configuração do Supabase incompleta no servidor." },
        { status: 503 },
      ),
    };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, banned")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.banned || profile.role !== "admin") {
    return {
      error: NextResponse.json({ ok: false, message: "Acesso negado." }, { status: 403 }),
    };
  }

  return { user };
}
