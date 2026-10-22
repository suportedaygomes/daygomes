import { createHmac, timingSafeEqual } from "node:crypto";

export function readWhatsAppVerifyToken(): string | null {
  const token = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();
  return token || null;
}

export function readWhatsAppAppSecret(): string | null {
  const secret = process.env.WHATSAPP_APP_SECRET?.trim();
  return secret || null;
}

/** Valida assinatura X-Hub-Signature-256 (Meta). */
export function isValidMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const received = signatureHeader.slice("sha256=".length);

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(received, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
