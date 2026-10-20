const SAO_PAULO_TZ = "America/Sao_Paulo";

export function todayInSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SAO_PAULO_TZ }).format(new Date());
}
