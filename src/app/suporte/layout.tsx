import { CookieConsentBanner } from "@/components/legal/cookie-consent-banner";

export default function SuportePublicLayout({ children }: LayoutProps<"/suporte">) {
  return (
    <div className="login-forced-dark min-h-dvh text-foreground">
      {children}
      <CookieConsentBanner />
    </div>
  );
}
