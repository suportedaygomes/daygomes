import { randomBytes } from "node:crypto";

type HeaderPair = { key: string; value: string };

export const CSP_NONCE_HEADER = "x-nonce";

export function createRequestNonce(): string {
  return randomBytes(16).toString("base64");
}

/** Cabeçalhos sem CSP (rotas estáticas/API via next.config). */
export function baselineSecurityHeaders(): HeaderPair[] {
  const headers: HeaderPair[] = [
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value:
        "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
    },
  ];

  if (process.env.NODE_ENV === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}

/** Cabeçalhos completos para páginas HTML (proxy), com CSP e nonce por requisição. */
export function securityHeaders(nonce: string): HeaderPair[] {
  return [
    ...baselineSecurityHeaders(),
    { key: "Content-Security-Policy", value: contentSecurityPolicy(nonce) },
  ];
}

function contentSecurityPolicy(nonce: string): string {
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
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  if (process.env.NODE_ENV === "production") {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function applySecurityHeaders(headers: Headers, nonce: string): void {
  for (const { key, value } of securityHeaders(nonce)) {
    headers.set(key, value);
  }
  headers.set(CSP_NONCE_HEADER, nonce);
}

/** Repassa CSP/nonce ao App Router (Next lê `content-security-policy` no request). */
export function applySecurityRequestHeaders(headers: Headers, nonce: string): void {
  for (const { key, value } of securityHeaders(nonce)) {
    headers.set(key, value);
  }
  headers.set(CSP_NONCE_HEADER, nonce);
}
