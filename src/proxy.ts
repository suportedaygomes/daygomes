import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  applySecurityHeaders,
  applySecurityRequestHeaders,
  createRequestNonce,
} from "@/lib/security/headers";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export async function proxy(request: NextRequest) {
  const nonce = createRequestNonce();
  const requestHeaders = new Headers(request.headers);
  applySecurityRequestHeaders(requestHeaders, nonce);
  const forward = { headers: requestHeaders };

  let supabaseResponse = NextResponse.next({ request: forward });
  const { url, anonKey } = getSupabasePublicEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request: forward });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicAuthRoute =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/auth/") ||
    pathname === "/suporte" ||
    pathname === "/termos" ||
    pathname === "/privacidade" ||
    pathname === "/cookies";

  if (user && pathname === "/suporte") {
    return redirectWithCookies(request, "/painel/suporte", supabaseResponse, nonce);
  }

  if (!user && !isPublicAuthRoute) {
    return redirectWithCookies(request, "/login", supabaseResponse, nonce);
  }

  if (user && pathname === "/login") {
    return redirectWithCookies(request, "/painel", supabaseResponse, nonce);
  }

  if (user && pathname === "/login/recuperar") {
    return redirectWithCookies(request, "/painel", supabaseResponse, nonce);
  }

  return withSecurityHeaders(supabaseResponse, nonce);
}

function redirectWithCookies(
  request: NextRequest,
  pathname: string,
  supabaseResponse: NextResponse,
  nonce: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  const redirectResponse = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return withSecurityHeaders(redirectResponse, nonce);
}

function withSecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  applySecurityHeaders(response.headers, nonce);
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sw.js|offline.html|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
