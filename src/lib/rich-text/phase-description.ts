import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "span",
  "div",
];

const PURIFY_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS,
  ALLOWED_ATTR: ["style", "type", "class"],
};

let hooksRegistered = false;

function ensureSanitizeHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;
  DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
    if (data.attrName !== "style") return;
    const value = data.attrValue ?? "";
    const parts = value
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean);
    const safe = parts.every(
      (part) =>
        /^text-align:\s*(left|center|right|justify)$/i.test(part) ||
        /^white-space:\s*pre-wrap$/i.test(part),
    );
    if (!safe) {
      data.keepAttr = false;
    }
  });
}

export function sanitizePhaseDescriptionHtml(html: string): string {
  ensureSanitizeHooks();
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
}

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

export function normalizePhaseDescriptionForDisplay(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (looksLikePhaseDescriptionHtml(trimmed)) {
    return sanitizePhaseDescriptionHtml(trimmed);
  }
  const escaped = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p style="white-space: pre-wrap">${escaped}</p>`;
}
