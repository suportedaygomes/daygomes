import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { PainelNav } from "@/components/painel/painel-nav";
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
    <main className="safe-screen mx-auto flex min-h-dvh w-full max-w-6xl flex-col">
      <header className="border-b border-[color:var(--border-subtle)] py-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <PainelNav role={profile.role} />

          <div className="flex shrink-0 items-center gap-2 border-l border-[color:var(--border-subtle)] pl-3 sm:gap-3 sm:pl-4">
            <ThemeToggle variant="icon" />
            <Link
              href="/painel/perfil"
              className="flex min-w-0 max-w-[9rem] items-center gap-2 rounded-lg border border-transparent py-1 transition hover:border-white/10 hover:bg-white/5 sm:max-w-[11rem] sm:gap-2.5"
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt=""
                  width={40}
                  height={40}
                  unoptimized
                  className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/15"
                />
              ) : (
                <Image
                  src="/icons/icon-192.png"
                  alt=""
                  width={40}
                  height={40}
                  className="h-9 w-9 shrink-0 rounded-full ring-1 ring-white/15"
                />
              )}
              <div className="min-w-0 hidden text-left md:block">
                <p className="truncate text-sm font-medium leading-tight">{displayName}</p>
                <p className="truncate text-[11px] text-muted">{ROLE_LABELS[profile.role]}</p>
              </div>
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mt-6 w-full flex-1 pb-8 sm:mt-8">{children}</div>
    </main>
  );
}
