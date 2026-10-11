import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { LegalFooterLinks } from "@/components/legal/legal-footer-links";
import { SupportRequestForm } from "@/components/support/support-request-form";

export const metadata: Metadata = {
  title: "Suporte",
  description: "Peça ajuda à equipe Day Gomes.",
};

export default function SuportePublicPage() {
  return (
    <main className="safe-screen flex min-h-dvh flex-col">
      <header className="relative shrink-0 pb-1 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-1/2 h-40 w-[min(20rem,85vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(171,95,208,0.4),transparent_70%)] blur-2xl"
        />
        <Link href="/login" className="relative z-10 mx-auto block w-fit pt-1">
          <Image
            src="/logoday.png"
            alt="Logotipo Day Gomes"
            width={843}
            height={559}
            priority
            sizes="(min-width: 640px) 280px, 220px"
            className="login-logo mx-auto h-auto w-full max-w-[13rem] object-contain sm:max-w-[16rem]"
          />
        </Link>
        <h1 className="relative z-10 mt-2 text-lg font-semibold tracking-tight sm:text-xl">
          Suporte
        </h1>
        <p className="relative z-10 mt-1 text-sm text-muted">
          Resposta por e-mail ou WhatsApp.{" "}
          <Link href="/login" className="text-purple hover:underline">
            Já tem conta?
          </Link>
        </p>
      </header>

      <div className="mx-auto flex w-full min-h-0 max-w-xl flex-1 flex-col justify-center gap-3 py-3 sm:max-w-2xl">
        <SupportRequestForm mode="guest" compact />
        <p className="text-center text-xs leading-5 text-muted">
          Ao enviar, você concorda com o tratamento dos dados conforme a{" "}
          <Link href="/privacidade" className="text-purple hover:underline">
            Política de Privacidade
          </Link>
          .
        </p>
        <LegalFooterLinks />
      </div>
    </main>
  );
}
