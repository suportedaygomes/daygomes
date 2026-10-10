import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import {
  getAvatarPublicUrl,
  getDisplayName,
  type ProfileRow,
} from "@/lib/auth/profile";
import { ROLE_LABELS } from "@/lib/roles";
import type { User } from "@supabase/supabase-js";

type PainelShellProps = {
  user: User;
  profile: ProfileRow;
  supabaseUrl: string;
  children: React.ReactNode;
};

export function PainelShell({
  user,
  profile,
  supabaseUrl,
  children,
}: PainelShellProps) {
  const avatarUrl = getAvatarPublicUrl(supabaseUrl, profile.avatar_path);
  const displayName = getDisplayName(user, profile);

  return (
    <main className="safe-screen mx-auto flex min-h-dvh w-full max-w-5xl flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={56}
              height={56}
              unoptimized
              className="h-12 w-12 rounded-2xl object-cover sm:h-14 sm:w-14"
            />
          ) : (
            <Image
              src="/icons/icon-192.png"
              alt=""
              width={192}
              height={192}
              className="h-12 w-12 rounded-2xl sm:h-14 sm:w-14"
            />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold sm:text-base">{displayName}</p>
            <p className="truncate text-xs text-muted sm:text-sm">
              {ROLE_LABELS[profile.role]}
            </p>
          </div>
        </div>
        <LogoutButton />
      </header>

      <nav
        className="mt-4 flex flex-wrap gap-2"
        aria-label="Navegação do painel"
      >
        <NavLink href="/painel">Início</NavLink>
        <NavLink href="/painel/perfil">Meu perfil</NavLink>
        {profile.role === "membro" ? (
          <NavLink href="/painel/editais">Meus editais</NavLink>
        ) : null}
        {profile.role === "corretor" || profile.role === "admin" ? (
          <NavLink href="/painel/correcoes">Correções</NavLink>
        ) : null}
        {profile.role === "admin" ? (
          <>
            <NavLink href="/painel/admin/usuarios">Usuários</NavLink>
            <NavLink href="/painel/admin/editais">Editais</NavLink>
            <NavLink href="/painel/admin/kiwify">Kiwify</NavLink>
          </>
        ) : null}
      </nav>

      <div className="mt-8 flex-1 pb-8">{children}</div>
    </main>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-foreground transition hover:border-purple/50 hover:bg-white/5"
    >
      {children}
    </Link>
  );
}
