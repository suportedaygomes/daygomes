import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PublicHomeView } from "@/components/marketing/public-home-view";
import { getCurrentProfile } from "@/lib/auth/profile";
import { LEGAL_SITE_URL, SITE_DISPLAY_NAME } from "@/lib/legal/site";

const siteUrl = LEGAL_SITE_URL.replace(/^https?:\/\/(www\.)?/, "https://www.");

export const metadata: Metadata = {
  title: SITE_DISPLAY_NAME,
  description:
    "Plataforma de mentoria e correção de redações da Professora Day Gomes — educação e preparação para concursos.",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: SITE_DISPLAY_NAME,
    title: SITE_DISPLAY_NAME,
    description:
      "Mentoria e correção de redações. Entre na plataforma para enviar atividades e receber correções.",
  },
};

export default async function HomePage() {
  const { user } = await getCurrentProfile();
  if (user) redirect("/painel");

  return <PublicHomeView />;
}
