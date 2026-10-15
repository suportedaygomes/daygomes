"use client";

import { PwaInstallHint } from "@/components/pwa-install-hint";
import { PwaRegister } from "@/components/pwa-register";
import { SupabaseAuthSync } from "@/components/supabase-auth-sync";
import { ThemeProvider } from "@/components/theme/theme-provider";
import type { SiteTheme } from "@/lib/theme/storage";

type AppProvidersProps = {
  children: React.ReactNode;
  initialTheme: SiteTheme;
};

export function AppProviders({ children, initialTheme }: AppProvidersProps) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <SupabaseAuthSync />
      {children}
      <PwaInstallHint />
      <PwaRegister />
    </ThemeProvider>
  );
}
