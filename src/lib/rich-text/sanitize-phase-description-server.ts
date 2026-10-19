import "server-only";

/**
 * Sanitização leve no servidor (sem jsdom/DOMPurify), para rotas de API em produção.
 * O admin já edita no painel; removemos vetores óbvios e mantemos HTML básico.
 */
export function sanitizePhaseDescriptionHtmlServer(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "";

  return trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}
