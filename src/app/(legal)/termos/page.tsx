import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { TERMS_OF_USE } from "@/lib/legal/documents";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de Uso da plataforma Day Gomes.",
};

export default function TermosPage() {
  return (
    <LegalDocumentView
      title="Termos de Uso"
      intro="Leia com atenção as condições para utilizar a plataforma Day Gomes, incluindo cadastro, envio de atividades, correções e suporte."
      sections={TERMS_OF_USE}
    />
  );
}
