import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { PainelShell } from "@/components/painel/painel-shell";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: LayoutProps<"/painel">) {
  const { user, profile, profileLoadFailed } = await getCurrentProfile();
  const { url } = getSupabasePublicEnv();

  if (!user) {
    redirect("/login");
  }

  if (!profile) {
    return (
      <main className="safe-screen mx-auto flex min-h-dvh w-full max-w-6xl flex-col justify-center gap-4 px-5">
        <h1 className="text-2xl font-semibold">
          {profileLoadFailed ? "Falha ao carregar seu perfil" : "Perfil não encontrado"}
        </h1>
        <p className="text-muted leading-7">
          {profileLoadFailed
            ? "Sua sessão continua ativa, mas não conseguimos buscar os dados agora. Atualize a página ou tente de novo em instantes."
            : "Sua conta existe, mas não há cadastro de perfil. Entre em contato com a administração."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/painel"
            className="inline-flex h-11 items-center rounded-xl bg-purple-deep px-5 text-sm font-semibold text-white"
          >
            Tentar de novo
          </Link>
          <LogoutButton />
        </div>
      </main>
    );
  }

  if (profile.banned) {
    return (
      <main className="safe-screen mx-auto flex min-h-dvh w-full max-w-6xl flex-col justify-center">
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
