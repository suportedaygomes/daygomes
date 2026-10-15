import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Outfit } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import { SITE_DISPLAY_NAME } from "@/lib/legal/site";
import { parseThemeCookie, THEME_STORAGE_KEY, type SiteTheme } from "@/lib/theme/storage";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: {
    default: SITE_DISPLAY_NAME,
    template: `%s · ${SITE_DISPLAY_NAME}`,
  },
  description: `App ${SITE_DISPLAY_NAME} para celular, tablet e computador.`,
  applicationName: SITE_DISPLAY_NAME,
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_DISPLAY_NAME,
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
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
  const cookieStore = await cookies();
  const initialTheme: SiteTheme = parseThemeCookie(
    cookieStore.get(THEME_STORAGE_KEY)?.value,
  );

  return (
    <html
      lang="pt-BR"
      className={`${outfit.variable} h-full antialiased`}
      data-theme={initialTheme === "light" ? "light" : undefined}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <AppProviders initialTheme={initialTheme}>{children}</AppProviders>
      </body>
    </html>
  );
}
