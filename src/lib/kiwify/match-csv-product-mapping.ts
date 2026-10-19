export type KiwifyMappingForMatch = {
  kiwify_product_id: string;
  kiwify_product_name: string | null;
  edital_id: string;
  edital_title: string | null;
  correction_quota: number;
  is_active: boolean;
};

export function normalizeProductLabel(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Associa o nome do produto no CSV da Kiwify a um mapeamento ativo (produto → edital).
 */
export function matchCsvProductToMapping(
  csvProductName: string,
  mappings: KiwifyMappingForMatch[],
): KiwifyMappingForMatch | null {
  const key = normalizeProductLabel(csvProductName);
  if (!key) return null;

  const active = mappings.filter((m) => m.is_active);
  if (!active.length) return null;

  for (const mapping of active) {
    const mappedName = mapping.kiwify_product_name
      ? normalizeProductLabel(mapping.kiwify_product_name)
      : "";
    if (mappedName && mappedName === key) {
      return mapping;
    }
  }

  let best: { mapping: KiwifyMappingForMatch; score: number } | null = null;

  for (const mapping of active) {
    const mappedName = mapping.kiwify_product_name
      ? normalizeProductLabel(mapping.kiwify_product_name)
      : "";
    const editalTitle = mapping.edital_title
      ? normalizeProductLabel(mapping.edital_title)
      : "";

    const candidates = [mappedName, editalTitle].filter((c) => c.length >= 6);
    for (const candidate of candidates) {
      if (key.includes(candidate) || candidate.includes(key)) {
        const score = Math.min(key.length, candidate.length);
        if (!best || score > best.score) {
          best = { mapping, score };
        }
      }
    }
  }

  return best?.mapping ?? null;
}
