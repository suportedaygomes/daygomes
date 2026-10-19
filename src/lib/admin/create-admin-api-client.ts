import "server-only";

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export function createAdminApiClientOrError() {
  try {
    return { admin: createAdminClient() };
  } catch (error) {
    console.error("[admin-api] service role missing", error);
    return {
      error: NextResponse.json(
        {
          ok: false,
          message: "Servidor sem credencial de administração. Contate o suporte técnico.",
        },
        { status: 503 },
      ),
    };
  }
}
