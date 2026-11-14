import { MAX_SUBMISSION_UPLOAD_BYTES } from "@/lib/files/submission-upload-limits";

const MAX_EDGE = 2400;

/**
 * Reduz fotos grandes no navegador para caber no limite de upload do servidor.
 */
export async function compressImageFileForUpload(
  file: File,
  maxBytes = MAX_SUBMISSION_UPLOAD_BYTES,
): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= maxBytes) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width > MAX_EDGE || height > MAX_EDGE) {
    const scale = MAX_EDGE / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  for (const quality of [0.9, 0.82, 0.72, 0.62]) {
    const blob = await canvasToJpegBlob(canvas, quality);
    if (blob && blob.size <= maxBytes) {
      const baseName = file.name.replace(/\.[^.]+$/i, "") || "atividade";
      return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
    }
  }

  const fallback = await canvasToJpegBlob(canvas, 0.55);
  if (fallback && fallback.size <= maxBytes) {
    const baseName = file.name.replace(/\.[^.]+$/i, "") || "atividade";
    return new File([fallback], `${baseName}.jpg`, { type: "image/jpeg" });
  }

  throw new Error(
    `A imagem continua grande demais após compactar (máx. ${formatMb(maxBytes)}). Tente outra foto ou envie em PDF.`,
  );
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
}

function formatMb(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}