const OFFICE_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.oasis.opendocument.text",
  "application/rtf",
  "text/rtf",
]);

export function isPdfMime(mime: string | null | undefined) {
  return mime === "application/pdf";
}

export function isImageMime(mime: string | null | undefined) {
  return Boolean(mime?.startsWith("image/"));
}

export function isOfficeMime(mime: string | null | undefined) {
  return Boolean(mime && OFFICE_MIMES.has(mime));
}

export function needsPdfPreview(mime: string | null | undefined) {
  return isOfficeMime(mime);
}
