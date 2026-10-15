import { SITE_DISPLAY_NAME } from "@/lib/legal/site";

type PainelBrandEyebrowProps = {
  suffix?: string;
};

export function PainelBrandEyebrow({ suffix = "Painel" }: PainelBrandEyebrowProps) {
  return (
    <p className="text-sm font-semibold tracking-wide">
      <span className="brand-day-gomes">{SITE_DISPLAY_NAME}</span>
      <span className="ml-2 text-foreground">{suffix}</span>
    </p>
  );
}
