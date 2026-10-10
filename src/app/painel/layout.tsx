import { redirect } from "next/navigation";
import { PainelShell } from "@/components/painel/painel-shell";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: LayoutProps<"/painel">) {
  const { user, profile } = await getCurrentProfile();
  const { url } = getSupabasePublicEnv();

  if (!user) {
    redirect("/login");
  }

  if (!profile) {
    redirect("/login");
  }

  if (profile.banned) {
    return (
      <main className="safe-screen mx-auto flex min-h-dvh max-w-3xl flex-col justify-center">
        <h1 className="text-3xl font-semibold">Conta indisponível</h1>
        <p className="mt-3 text-muted">
          Entre em contato com a administração para mais informações.
        </p>
      </main>
    );
  }

  return (
    <PainelShell user={user} profile={profile} supabaseUrl={url}>
      {children}
    </PainelShell>
  );
}
