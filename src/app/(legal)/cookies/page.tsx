import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { COOKIE_POLICY } from "@/lib/legal/documents";

export const metadata: Metadata = {
  title: "Política de Cookies",
  description: "Uso de cookies e tecnologias similares na Day Gomes.",
};

export default function CookiesPage() {
  return (
    <LegalDocumentView
      title="Política de Cookies"
      intro="Informações sobre cookies e armazenamento local utilizados no site e no aplicativo da Day Gomes."
      sections={COOKIE_POLICY}
    />
  );
}
