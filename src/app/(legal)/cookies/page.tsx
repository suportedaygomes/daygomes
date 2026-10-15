import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { COOKIE_POLICY } from "@/lib/legal/documents";
import { SITE_DISPLAY_NAME } from "@/lib/legal/site";

export const metadata: Metadata = {
  title: "Política de Cookies",
  description: `Uso de cookies e tecnologias similares na ${SITE_DISPLAY_NAME}.`,
};

export default function CookiesPage() {
  return (
    <LegalDocumentView
      title="Política de Cookies"
      intro={`Informações sobre cookies e armazenamento local utilizados no site e no aplicativo da ${SITE_DISPLAY_NAME}.`}
      sections={COOKIE_POLICY}
    />
  );
}
