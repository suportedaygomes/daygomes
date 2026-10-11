type HeaderPair = { key: string; value: string };

/** Cabeçalhos recomendados por securityheaders.com e boas práticas para o app. */
export function securityHeaders(): HeaderPair[] {
  const headers: HeaderPair[] = [
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value:
        "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
    },
    { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  ];

  if (process.env.NODE_ENV === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}

function contentSecurityPolicy(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  let supabaseOrigin = "https://*.supabase.co";
  let supabaseWs = "wss://*.supabase.co";
  if (supabaseUrl) {
    try {
      const host = new URL(supabaseUrl).host;
      supabaseOrigin = `https://${host}`;
      supabaseWs = `wss://${host}`;
    } catch {
      /* mantém wildcard */
    }
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    `connect-src 'self' ${supabaseOrigin} ${supabaseWs}`,
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  if (process.env.NODE_ENV === "production") {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function applySecurityHeaders(response: Headers): void {
  for (const { key, value } of securityHeaders()) {
    response.set(key, value);
  }
}
