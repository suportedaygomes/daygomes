import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { CSP_NONCE_HEADER } from "@/lib/security/headers";
import { Outfit } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { THEME_STORAGE_KEY } from "@/lib/theme/storage";
import "./globals.css";

const themeBootstrapScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"){document.documentElement.setAttribute("data-theme","light");document.documentElement.style.colorScheme="light";}}catch(e){}})();`;

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: {
    default: "Day Gomes",
    template: "%s · Day Gomes",
  },
  description: "App Day Gomes para celular, tablet e computador.",
  applicationName: "Day Gomes",
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Day Gomes",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3efe8" },
    { color: "#07070a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark light",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const nonce = (await headers()).get(CSP_NONCE_HEADER) ?? undefined;

  return (
    <html lang="pt-BR" className={`${outfit.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground">
        <Script id="theme-bootstrap" strategy="beforeInteractive" nonce={nonce}>
          {themeBootstrapScript}
        </Script>
        <ThemeProvider>
          {children}
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
