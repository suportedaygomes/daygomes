const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function normalizeWhatsapp(value: string) {
  return value.replace(/\D/g, "").slice(0, 13);
}

export function formatWhatsappDisplay(value: string) {
  const digits = normalizeWhatsapp(value);
  if (digits.length < 10) return value.trim();
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return digits;
}

export function validateSupportPayload(input: {
  email: string;
  whatsapp: string;
  title: string;
  description: string;
  file: File | null;
}) {
  const email = input.email.trim().toLowerCase();
  const whatsapp = normalizeWhatsapp(input.whatsapp);
  const title = input.title.trim();
  const description = input.description.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, error: "Informe um e-mail válido." };
  }
  if (whatsapp.length < 10) {
    return { ok: false as const, error: "Informe um WhatsApp válido (com DDD)." };
  }
  if (title.length < 3) {
    return { ok: false as const, error: "O título deve ter pelo menos 3 caracteres." };
  }
  if (description.length < 10) {
    return { ok: false as const, error: "Descreva o problema com pelo menos 10 caracteres." };
  }

  if (input.file) {
    if (!IMAGE_MIMES.has(input.file.type)) {
      return { ok: false as const, error: "Anexo permitido: imagem JPG, PNG ou WebP." };
    }
    if (input.file.size > MAX_ATTACHMENT_BYTES) {
      return { ok: false as const, error: "A imagem deve ter no máximo 8 MB." };
    }
  }

  return {
    ok: true as const,
    data: { email, whatsapp, title, description },
  };
}

export function extensionForImageMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export function validateSupportAttachmentFile(file: File) {
  if (!IMAGE_MIMES.has(file.type)) {
    return { ok: false as const, error: "Anexo permitido: imagem JPG, PNG ou WebP." };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { ok: false as const, error: "A imagem deve ter no máximo 8 MB." };
  }
  return { ok: true as const };
}

export { MAX_ATTACHMENT_BYTES, IMAGE_MIMES };
