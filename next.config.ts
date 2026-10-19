import path from "node:path";
import type { NextConfig } from "next";
import { baselineSecurityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Editais com muitos temas e descrições ricas podem ultrapassar o padrão (1 MB).
      bodySizeLimit: "25mb",
    },
  },
  serverExternalPackages: [
    "@sparticuz/chromium",
    "puppeteer-core",
    "isomorphic-dompurify",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/avatars/**",
      },
    ],
  },
  turbopack: {
    root: path.join(process.cwd()),
  },
  async headers() {
    const secure = baselineSecurityHeaders();
    return [
      {
        source: "/:path*",
        headers: secure,
      },
      {
        source: "/sw.js",
        headers: [
          ...secure,
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
