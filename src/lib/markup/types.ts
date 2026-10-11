export const MARKUP_COLORS = [
  { id: "yellow", label: "Amarelo", rgba: "rgba(250, 204, 21, 0.45)" },
  { id: "red", label: "Vermelho", rgba: "rgba(239, 68, 68, 0.45)" },
  { id: "green", label: "Verde", rgba: "rgba(34, 197, 94, 0.4)" },
  { id: "blue", label: "Azul", rgba: "rgba(59, 130, 246, 0.4)" },
] as const;

export type MarkupColorId = (typeof MARKUP_COLORS)[number]["id"];

export type MarkupAnnotation = {
  id: string;
  color: MarkupColorId;
  /** Página do PDF (1 = primeira). Imagens usam sempre 1. */
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  note: string;
};

export function markupColorRgba(color: MarkupColorId) {
  return MARKUP_COLORS.find((item) => item.id === color)?.rgba ?? MARKUP_COLORS[0].rgba;
}
