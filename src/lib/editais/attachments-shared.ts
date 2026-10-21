export const EDITAL_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

export type EditalAttachmentRow = {
  id: string;
  edital_id: string;
  title: string;
  description: string;
  storage_path: string;
  original_filename: string;
  mime_type: string | null;
  file_size: number;
  sort_order: number;
  is_published: boolean;
  created_at: string;
};

export type EditalAttachmentView = {
  id: string;
  title: string;
  description: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string | null;
  isPublished: boolean;
};

export function mapEditalAttachment(row: EditalAttachmentRow): EditalAttachmentView {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    originalFilename: row.original_filename,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    isPublished: row.is_published ?? true,
  };
}

export function editalAttachmentDownloadPath(editalId: string, attachmentId: string) {
  return `/api/editais/${editalId}/attachments/${attachmentId}/download`;
}

export function fileExtensionFromName(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "bin";
  const ext = base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext || "bin";
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
