import sharp from "sharp";

const MAX_IMAGE_EDGE = 2400;
const IMAGE_WEBP_QUALITY = 88;
const MAX_OTHER_BYTES = 8 * 1024 * 1024;

export type CompressedFile = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
};

export async function compressSubmissionFile(
  file: File,
): Promise<CompressedFile | { error: string }> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "application/octet-stream";

  if (mime.startsWith("image/")) {
    return compressImage(bytes, mime);
  }

  if (bytes.length > MAX_OTHER_BYTES) {
    return {
      error: "Arquivo muito grande. Envie até 8 MB ou use imagem para compactação automática.",
    };
  }

  const extension = extensionFromName(file.name) ?? "bin";
  return { buffer: bytes, mimeType: mime, extension };
}

async function compressImage(input: Buffer, mime: string) {
  const pipeline = sharp(input, { failOn: "none" }).rotate();
  const metadata = await pipeline.metadata();

  const resized = pipeline.resize({
    width: metadata.width && metadata.width > MAX_IMAGE_EDGE ? MAX_IMAGE_EDGE : undefined,
    height: metadata.height && metadata.height > MAX_IMAGE_EDGE ? MAX_IMAGE_EDGE : undefined,
    fit: "inside",
    withoutEnlargement: true,
  });

  const webp = await resized.webp({ quality: IMAGE_WEBP_QUALITY, effort: 4 }).toBuffer();

  if (mime === "image/png" && webp.length > input.length * 0.95) {
    const png = await resized.png({ compressionLevel: 9, palette: true }).toBuffer();
    if (png.length <= webp.length) {
      return { buffer: png, mimeType: "image/png", extension: "png" };
    }
  }

  return { buffer: webp, mimeType: "image/webp", extension: "webp" };
}

function extensionFromName(filename: string) {
  const parts = filename.split(".");
  if (parts.length < 2) return null;
  return parts.pop()?.toLowerCase() ?? null;
}
