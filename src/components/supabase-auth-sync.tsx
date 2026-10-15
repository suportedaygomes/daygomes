"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Mantém a sessão do Supabase alinhada com o App Router (cookies + RSC).
 * Sem isso, o token pode renovar no navegador e o servidor ainda enxergar sessão inválida.
 */
export function SupabaseAuthSync() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        router.refresh();
      } else if (event === "SIGNED_OUT") {
        router.replace("/login");
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
