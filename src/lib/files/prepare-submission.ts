import { compressSubmissionFile } from "@/lib/files/compress-submission";
import { convertOfficeBufferToPdf } from "@/lib/files/convert-office-to-pdf";
import { isImageMime, isOfficeMime, isPdfMime, needsPdfPreview } from "@/lib/files/mime";

export type PreparedSubmission = {
  originalBuffer: Buffer;
  originalMime: string;
  originalExtension: string;
  previewBuffer: Buffer | null;
  previewMime: string | null;
};

export async function prepareSubmission(file: File): Promise<PreparedSubmission | { error: string }> {
  const compressed = await compressSubmissionFile(file);
  if ("error" in compressed) {
    return { error: compressed.error };
  }

  const mime = compressed.mimeType;

  if (isImageMime(mime)) {
    return {
      originalBuffer: compressed.buffer,
      originalMime: mime,
      originalExtension: compressed.extension,
      previewBuffer: null,
      previewMime: null,
    };
  }

  if (isPdfMime(mime)) {
    return {
      originalBuffer: compressed.buffer,
      originalMime: mime,
      originalExtension: compressed.extension,
      previewBuffer: compressed.buffer,
      previewMime: "application/pdf",
    };
  }

  if (isOfficeMime(mime) || needsPdfPreview(mime)) {
    const converted = await convertOfficeBufferToPdf(compressed.buffer, file.name);
    if (!converted.ok) {
      return {
        error:
          "Não foi possível gerar o PDF para correção. Envie PDF ou imagem, ou configure GOTENBERG_URL no servidor.",
      };
    }

    return {
      originalBuffer: compressed.buffer,
      originalMime: mime,
      originalExtension: compressed.extension,
      previewBuffer: converted.pdf,
      previewMime: "application/pdf",
    };
  }

  return {
    error: "Formato não suportado. Envie imagem, PDF ou documento Word (.docx).",
  };
}
