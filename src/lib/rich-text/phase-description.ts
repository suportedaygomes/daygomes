import DOMPurify from "isomorphic-dompurify";
import {
  isPhaseDescriptionEmpty,
  looksLikePhaseDescriptionHtml,
  phaseDescriptionPlainText,
} from "@/lib/rich-text/phase-description-plain";

export { isPhaseDescriptionEmpty, looksLikePhaseDescriptionHtml, phaseDescriptionPlainText };

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
  ALLOWED_ATTR: ["style", "type", "class", "align"],
};

let hooksRegistered = false;

function ensureSanitizeHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;
  DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
    if (data.attrName === "align") {
      const align = (data.attrValue ?? "").toLowerCase();
      if (!["left", "center", "right", "justify"].includes(align)) {
        data.keepAttr = false;
      }
      return;
    }

    if (data.attrName === "class") {
      const allowed = (data.attrValue ?? "")
        .split(/\s+/)
        .filter((token) => /^phase-text-align-(left|center|right)$/.test(token));
      if (!allowed.length) {
        data.keepAttr = false;
        return;
      }
      data.attrValue = allowed.join(" ");
      return;
    }

    if (data.attrName !== "style") return;
    const value = data.attrValue ?? "";
    const parts = value
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean);
    const safeParts = parts.filter(
      (part) =>
        /^text-align:\s*(left|center|right|justify)$/i.test(part) ||
        /^white-space:\s*pre-wrap$/i.test(part) ||
        /^font-weight:\s*(bold|[5-9]00)$/i.test(part),
    );
    if (!safeParts.length) {
      data.keepAttr = false;
      return;
    }
    data.attrValue = safeParts.join("; ");
  });
}

export function sanitizePhaseDescriptionHtml(html: string): string {
  ensureSanitizeHooks();
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
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
