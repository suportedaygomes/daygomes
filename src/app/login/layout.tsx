import { CookieConsentBanner } from "@/components/legal/cookie-consent-banner";

export default function LoginLayout({ children }: LayoutProps<"/login">) {
  return (
    <div className="login-forced-dark min-h-dvh text-foreground">
      {children}
      <CookieConsentBanner />
    </div>
  );
}
