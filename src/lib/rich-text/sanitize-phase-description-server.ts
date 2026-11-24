import "server-only";

import { stripDangerousPhaseDescriptionHtml } from "@/lib/rich-text/strip-dangerous-html";

/**
 * Sanitização leve no servidor (sem jsdom/DOMPurify), para rotas de API em produção.
 */
export function sanitizePhaseDescriptionHtmlServer(html: string): string {
  return stripDangerousPhaseDescriptionHtml(html);
}
