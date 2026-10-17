type MemberCorrectionQuotaPanelProps = {
  correctionQuota: number;
  correctionsUsed: number;
  correctionsRemaining: number;
  compact?: boolean;
};

export function MemberCorrectionQuotaPanel({
  correctionQuota,
  correctionsUsed,
  correctionsRemaining,
  compact = false,
}: MemberCorrectionQuotaPanelProps) {
  const usedPercent =
    correctionQuota > 0
      ? Math.min(100, Math.round((correctionsUsed / correctionQuota) * 100))
      : 0;

  const remainingTone =
    correctionsRemaining <= 0
      ? "text-amber-200"
      : correctionsRemaining === 1
        ? "text-beige"
        : "text-emerald-200";

  if (compact) {
    return (
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-purple/30 bg-purple/10 px-4 py-3"
        aria-label="Correções disponíveis na mentoria"
      >
        <p className="text-sm text-muted">
          Correções do plano:{" "}
          <strong className={`text-xl tabular-nums ${remainingTone}`}>
            {correctionsRemaining}
          </strong>
          <span className="text-muted"> / {correctionQuota}</span>
          <span className="text-muted"> disponíveis</span>
        </p>
        <p className="text-xs text-muted">
          {correctionsUsed} utilizada{correctionsUsed === 1 ? "" : "s"}
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-purple/35 bg-gradient-to-br from-purple/15 to-white/[0.03] p-5 sm:p-6"
      aria-label="Correções disponíveis na mentoria"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-purple">
            Seu plano de correções
          </p>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className={`text-4xl font-bold tabular-nums sm:text-5xl ${remainingTone}`}>
              {correctionsRemaining}
            </span>
            <span className="text-lg text-muted">
              de {correctionQuota} correção{correctionQuota === 1 ? "" : "ões"} disponíveis
            </span>
          </p>
          <p className="mt-2 text-sm text-muted">
            Utilizadas:{" "}
            <strong className="text-foreground tabular-nums">{correctionsUsed}</strong> · Total do
            plano: <strong className="text-foreground tabular-nums">{correctionQuota}</strong>
          </p>
        </div>
        <div className="min-w-[10rem] flex-1 sm:max-w-xs">
          <div className="flex justify-between text-xs text-muted">
            <span>Uso da cota</span>
            <span className="tabular-nums">{usedPercent}%</span>
          </div>
          <div
            className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={correctionsUsed}
            aria-valuemin={0}
            aria-valuemax={correctionQuota}
            aria-label="Correções utilizadas"
          >
            <div
              className="h-full rounded-full bg-purple transition-[width]"
              style={{ width: `${usedPercent}%` }}
            />
          </div>
        </div>
      </div>
      <ul className="mt-4 flex flex-col gap-1.5 border-t border-white/10 pt-4 text-sm text-muted">
        <li>
          <strong className="font-medium text-foreground">1ª vez em uma fase</strong> → usa{" "}
          <strong className="text-foreground">1</strong> correção do plano.
        </li>
        <li>
          <strong className="font-medium text-foreground">Reenvio gratuito</strong> na mesma fase →{" "}
          <strong className="text-foreground">não</strong> consome outra correção.
        </li>
        <li>
          <strong className="font-medium text-foreground">Reenvio com cota</strong> (quando o
          corretor escolher) → usa <strong className="text-foreground">1</strong> correção do plano.
        </li>
        <li>
          Enviar em <strong className="font-medium text-foreground">outra fase</strong> pela
          primeira vez → usa outra correção do plano.
        </li>
      </ul>
    </div>
  );
}
