type PainelBrandEyebrowProps = {
  suffix?: string;
};

export function PainelBrandEyebrow({ suffix = "Painel" }: PainelBrandEyebrowProps) {
  return (
    <p className="text-sm font-semibold tracking-wide">
      <span className="brand-day-gomes">Day Gomes</span>
      <span className="ml-2 text-foreground">{suffix}</span>
    </p>
  );
}
