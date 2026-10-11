import { CookieConsentBanner } from "@/components/legal/cookie-consent-banner";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="login-forced-dark min-h-dvh text-foreground">
      <div className="safe-screen mx-auto max-w-3xl py-8 sm:py-12">{children}</div>
      <CookieConsentBanner />
    </div>
  );
}
