import Image from "next/image";
import Link from "next/link";
import { LegalEntityNotice } from "@/components/legal/legal-entity-notice";
import { LegalFooterLinks } from "@/components/legal/legal-footer-links";
import { LEGAL_CONTACT_EMAIL, SITE_DISPLAY_NAME } from "@/lib/legal/site";

export function PublicHomeView() {
  return (
    <main className="safe-screen flex min-h-dvh flex-col">
      <header className="relative shrink-0 pb-4 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-1/2 h-48 w-[min(22rem,90vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(171,95,208,0.4),transparent_70%)] blur-2xl"
        />
        <Image
          src="/logoday.png"
          alt={`Logotipo ${SITE_DISPLAY_NAME}`}
          width={843}
          height={559}
          priority
          sizes="(min-width: 640px) 300px, 240px"
          className="login-logo relative z-10 mx-auto h-auto w-full max-w-[15rem] object-contain sm:max-w-[18rem]"
        />
        <h1 className="relative z-10 mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
          {SITE_DISPLAY_NAME}
        </h1>
        <p className="relative z-10 mx-auto mt-3 max-w-lg px-4 text-base leading-7 text-muted">
          Mentoria e correção de redações para concursos e processos seletivos. Acesse sua conta
          para enviar atividades e receber feedback da equipe.
        </p>
      </header>

      <section className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-5 pb-8">
        <Link href="/login" className="btn-primary h-14 text-center text-base font-semibold leading-[3.5rem]">
          Entrar na plataforma
        </Link>
        <p className="text-center text-sm text-muted">
          Dúvidas?{" "}
          <Link href="/suporte" className="text-purple hover:underline">
            Fale com o suporte
          </Link>
          {" · "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-purple hover:underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
        <LegalEntityNotice className="mt-2" />
        <nav className="mt-4 flex justify-center">
          <LegalFooterLinks />
        </nav>
      </section>
    </main>
  );
}
