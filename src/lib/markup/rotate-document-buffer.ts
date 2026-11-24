import { PDFDocument, degrees } from "pdf-lib";
import sharp from "sharp";
import type { ImageRotation } from "@/lib/markup/image-rotation";

function isPdfBytes(buffer: Buffer, contentType: string): boolean {
  if (contentType === "application/pdf") return true;
  return buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
}

export async function rotateDocumentBuffer(
  buffer: Buffer,
  contentType: string,
  rotation: ImageRotation,
): Promise<Buffer> {
  if (rotation === 0) return buffer;

  if (isPdfBytes(buffer, contentType)) {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    for (const page of doc.getPages()) {
      const current = page.getRotation().angle;
      page.setRotation(degrees(current + rotation));
    }
    return Buffer.from(await doc.save());
  }

  if (contentType.startsWith("image/")) {
    return sharp(buffer, { failOn: "none" }).rotate(rotation).toBuffer();
  }

  return buffer;
}