import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { PRIVACY_POLICY } from "@/lib/legal/documents";
import { SITE_DISPLAY_NAME } from "@/lib/legal/site";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: `Como a ${SITE_DISPLAY_NAME} trata dados pessoais (LGPD).`,
};

export default function PrivacidadePage() {
  return (
    <LegalDocumentView
      title="Política de Privacidade"
      intro="Esta política explica quais dados coletamos, por qual motivo, com quem compartilhamos e quais são os seus direitos como titular, nos termos da LGPD."
      sections={PRIVACY_POLICY}
    />
  );
}
