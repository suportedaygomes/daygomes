import DOMPurify from "isomorphic-dompurify";
import {
  isPhaseDescriptionEmpty,
  looksLikePhaseDescriptionHtml,
  phaseDescriptionPlainText,
} from "@/lib/rich-text/phase-description-plain";
import { stripDangerousPhaseDescriptionHtml } from "@/lib/rich-text/strip-dangerous-html";

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
  "h3",
  "h4",
  "blockquote",
];

const PURIFY_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS,
  ALLOWED_ATTR: ["style", "type", "class", "align"],
};

const TEXT_ALIGN_VALUES = new Set(["left", "center", "right", "justify", "start", "end"]);

function normalizeTextAlignValue(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  if (value === "start" || value === "-webkit-left") return "left";
  if (value === "end" || value === "-webkit-right") return "right";
  if (value === "-webkit-center") return "center";
  if (TEXT_ALIGN_VALUES.has(value)) return value === "start" ? "left" : value === "end" ? "right" : value;
  return null;
}

function isAllowedStyleDeclaration(part: string): boolean {
  const normalized = part.trim().toLowerCase();
  if (/^text-align:\s*.+$/i.test(normalized)) {
    const align = normalized.replace(/^text-align:\s*/i, "");
    return normalizeTextAlignValue(align) !== null;
  }
  if (/^white-space:\s*pre-wrap$/i.test(normalized)) return true;
  if (/^font-weight:\s*(bold|bolder|[5-9]00|normal)$/i.test(normalized)) return true;
  if (/^font-style:\s*(italic|normal)$/i.test(normalized)) return true;
  if (
    /^text-decoration:\s*(underline|line-through|none)$/i.test(normalized) ||
    /^text-decoration-line:\s*(underline|line-through|none)$/i.test(normalized)
  ) {
    return true;
  }
  return false;
}

function normalizeStyleAttribute(value: string): string | null {
  const parts = value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  const safeParts: string[] = [];
  for (const part of parts) {
    if (!isAllowedStyleDeclaration(part)) continue;
  if (/^text-align:/i.test(part)) {
      const align = part.replace(/^text-align:\s*/i, "");
      const fixed = normalizeTextAlignValue(align);
      if (fixed) safeParts.push(`text-align: ${fixed}`);
      continue;
    }
    safeParts.push(part);
  }
  return safeParts.length ? safeParts.join("; ") : null;
}

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
    const normalized = normalizeStyleAttribute(data.attrValue ?? "");
    if (!normalized) {
      data.keepAttr = false;
      return;
    }
    data.attrValue = normalized;
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
    return stripDangerousPhaseDescriptionHtml(trimmed);
  }
  const escaped = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p style="white-space: pre-wrap">${escaped}</p>`;
}
