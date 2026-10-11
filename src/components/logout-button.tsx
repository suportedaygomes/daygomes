"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className="h-[2.125rem] shrink-0 rounded-lg border border-white/12 px-3 text-xs font-medium leading-none text-muted transition hover:border-white/20 hover:bg-white/5 hover:text-foreground disabled:opacity-60 sm:px-3.5 sm:text-sm"
    >
      {pending ? "Saindo..." : "Sair"}
    </button>
  );
}
