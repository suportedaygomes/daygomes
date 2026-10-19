/** Utilitários de texto sem DOMPurify — seguros para rotas de API no servidor. */

export function phaseDescriptionPlainText(html: string): string {
  const stripped = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  return stripped.replace(/\n{3,}/g, "\n\n").trim();
}

export function isPhaseDescriptionEmpty(html: string): boolean {
  return phaseDescriptionPlainText(html).length === 0;
}

export function looksLikePhaseDescriptionHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}
