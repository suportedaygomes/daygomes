/**
 * Combina cota já existente na inscrição com a cota do produto Kiwify recém-comprado.
 *
 * - Produto com 0 correções (mentoria só conteúdo): não reduz cota; mantém pacotes já comprados.
 * - Produto com 1–4 correções: usa o maior valor (upgrade de pacote).
 */
export function mergeKiwifyEnrollmentQuota(
  existingQuota: number | null | undefined,
  purchasedQuota: number,
): number {
  const current = Math.max(0, Math.round(existingQuota ?? 0));
  const purchased = Math.max(0, Math.min(4, Math.round(purchasedQuota)));

  if (purchased === 0) {
    return current;
  }

  return Math.max(current, purchased);
}
