/** Remove vetores óbvios; mantém HTML de formatação do admin (negrito, listas, alinhamento). */
export function stripDangerousPhaseDescriptionHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "";

  return trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}