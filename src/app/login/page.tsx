import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entre na sua conta Day Gomes.",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
      <section className="relative flex items-center justify-center overflow-hidden px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 lg:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute top-[16%] left-[6%] h-[min(26rem,78vw)] w-[min(26rem,78vw)] rounded-full bg-[radial-gradient(circle,rgba(171,95,208,0.55),transparent_68%)] blur-2xl"
        />
        <Image
          src="/logoday.png"
          alt="Logotipo Day Gomes"
          width={843}
          height={559}
          priority
          sizes="(min-width: 1024px) 46vw, 100vw"
          className="login-logo relative z-10 mx-auto h-auto w-full max-w-[22rem] object-contain sm:max-w-lg lg:max-h-[72vh] lg:max-w-2xl"
        />
      </section>

      <section className="flex items-center justify-center px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-10 lg:px-14 lg:pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
