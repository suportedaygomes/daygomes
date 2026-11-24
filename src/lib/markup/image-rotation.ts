import type { MarkupAnnotation } from "@/lib/markup/types";

export type ImageRotation = 0 | 90 | 180 | 270;

export function normalizeImageRotation(value: unknown): ImageRotation {
  let n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  n = ((n % 360) + 360) % 360;
  if (n === 90 || n === 180 || n === 270) return n;
  return 0;
}

function rotateAnnotation90CW(item: MarkupAnnotation): MarkupAnnotation {
  return {
    ...item,
    x: 1 - item.y - item.height,
    y: item.x,
    width: item.height,
    height: item.width,
  };
}

/** Ajusta marcações ao girar a imagem (graus positivos = horário). */
export function rotateMarkupAnnotations(
  annotations: MarkupAnnotation[],
  deltaDegrees: 90 | -90,
): MarkupAnnotation[] {
  const steps = deltaDegrees === 90 ? 1 : 3;
  return annotations.map((item) => {
    let next = item;
    for (let i = 0; i < steps; i += 1) {
      next = rotateAnnotation90CW(next);
    }
    return next;
  });
}

export function addPreviewRotationParam(url: string, rotation: ImageRotation): string {
  if (rotation === 0) return url;
  const parsed = new URL(url, "http://local");
  parsed.searchParams.set("r", String(rotation));
  const search = parsed.searchParams.toString();
  const path = url.split("?")[0];
  return search ? `${path}?${search}` : path;
}