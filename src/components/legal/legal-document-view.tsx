import Link from "next/link";
import type { LegalSection } from "@/lib/legal/documents";
import { LegalEntityNotice } from "@/components/legal/legal-entity-notice";
import { LEGAL_LAST_UPDATED, LEGAL_SITE_NAME } from "@/lib/legal/site";

type LegalDocumentViewProps = {
  title: string;
  intro: string;
  sections: LegalSection[];
};

export function LegalDocumentView({ title, intro, sections }: LegalDocumentViewProps) {
  return (
    <article className="legal-doc">
      <header className="mb-8 border-b border-white/10 pb-6">
        <p className="text-sm font-semibold tracking-wide text-purple">{LEGAL_SITE_NAME}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm text-muted">Última atualização: {LEGAL_LAST_UPDATED}</p>
        <p className="mt-4 text-base leading-7 text-muted">{intro}</p>
        <LegalEntityNotice className="mt-6 text-left" />
      </header>

      <div className="flex flex-col gap-8">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-6">
            <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
            <div className="mt-3 flex flex-col gap-3">
              {section.paragraphs.map((paragraph, index) => (
                <p key={index} className="text-base leading-7 text-muted">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-12 border-t border-white/10 pt-6 text-sm text-muted">
        <p>
          Documentos relacionados:{" "}
          <Link href="/termos" className="text-purple hover:underline">Termos de Uso</Link>
          {", "}
          <Link href="/privacidade" className="text-purple hover:underline">
            Política de Privacidade
          </Link>
          {", "}
          <Link href="/cookies" className="text-purple hover:underline">
            Política de Cookies
          </Link>
          .
        </p>
        <p className="mt-3">
          <Link href="/login" className="text-purple hover:underline">Voltar ao login</Link>
        </p>
      </footer>
    </article>
  );
}
