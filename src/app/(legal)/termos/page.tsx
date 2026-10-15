import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { TERMS_OF_USE } from "@/lib/legal/documents";
import { SITE_DISPLAY_NAME } from "@/lib/legal/site";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: `Termos de Uso da plataforma ${SITE_DISPLAY_NAME}.`,
};

export default function TermosPage() {
  return (
    <LegalDocumentView
      title="Termos de Uso"
      intro={`Leia com atenção as condições para utilizar a plataforma ${SITE_DISPLAY_NAME}, incluindo cadastro, envio de atividades, correções e suporte.`}
      sections={TERMS_OF_USE}
    />
  );
}
