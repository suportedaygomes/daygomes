import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/components/login-form";
import { SITE_DISPLAY_NAME } from "@/lib/legal/site";

export const metadata: Metadata = {
  title: "Entrar",
  description: `Entre na sua conta ${SITE_DISPLAY_NAME}.`,
};

export default function LoginPage() {
  return (
    <main className="login-forced-light grid min-h-dvh grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
      <section className="order-2 flex items-center justify-center px-4 pb-4 pt-2 sm:px-8 lg:order-1 lg:px-12 lg:pb-0 lg:pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="login-brand-mark relative mx-auto w-full max-w-xl sm:max-w-2xl lg:max-w-3xl">
          <Image
            src="/logonova-login.png"
            alt={`Logotipo ${SITE_DISPLAY_NAME}`}
            width={1984}
            height={793}
            priority
            unoptimized
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="login-hero-image relative z-10 mx-auto h-auto w-full object-contain lg:max-h-[min(72vh,28rem)]"
          />
        </div>
      </section>

      <section className="order-1 flex items-end justify-center px-5 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center sm:pb-4 lg:order-2 lg:px-14 lg:pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
