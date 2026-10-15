import type { MetadataRoute } from "next";
import { SITE_DISPLAY_NAME } from "@/lib/legal/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE_DISPLAY_NAME,
    short_name: "Day Gomes",
    description: `App ${SITE_DISPLAY_NAME} para celular, tablet e computador.`,
    start_url: "/painel",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#07070a",
    theme_color: "#07070a",
    lang: "pt-BR",
    categories: ["education"],
    shortcuts: [
      {
        name: "Painel",
        short_name: "Painel",
        url: "/painel",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Entrar",
        short_name: "Login",
        url: "/login",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
