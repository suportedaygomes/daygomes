import path from "node:path";
import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
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
    const secure = securityHeaders();
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
