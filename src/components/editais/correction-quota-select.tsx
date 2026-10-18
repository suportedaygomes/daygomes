import { MAX_CORRECTION_QUOTA, MIN_KIWIFY_CORRECTION_QUOTA } from "@/lib/editais/enrollment-quota";

type CorrectionQuotaSelectProps = {
  value: number;
  onChange: (value: number) => void;
  id?: string;
  /** Texto do campo no formulário de edital vs mapeamento Kiwify */
  variant: "edital-default" | "kiwify-product";
};

const OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "0 — só acesso (sem correções na compra principal)" },
  { value: 1, label: "1 correção" },
  { value: 2, label: "2 correções" },
  { value: 3, label: "3 correções" },
  { value: 4, label: "4 correções (padrão das mentorias completas)" },
];

export function CorrectionQuotaSelect({
  value,
  onChange,
  id,
  variant,
}: CorrectionQuotaSelectProps) {
  const label =
    variant === "edital-default"
      ? "Correções na compra principal (Kiwify)"
      : "Correções incluídas nesta compra";

  const hint =
    variant === "edital-default"
      ? "Define o padrão desta mentoria ao mapear o produto principal na Kiwify. Pacotes avulsos de 1–4 correções podem ter outros valores no mapeamento."
      : "Ao escolher o edital, o valor sugere o cadastrado na mentoria; ajuste se este produto for pacote avulso.";

  return (
    <div className="flex flex-col gap-2 text-sm font-medium">
      <label className="flex flex-col gap-2" htmlFor={id}>
        {label}
        <select
          id={id}
          className="field-input max-w-md"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        >
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <p className="text-xs font-normal text-muted">{hint}</p>
    </div>
  );
}

export function formatEditalDefaultCorrectionQuota(quota: number): string {
  if (quota === 0) return "0 (só conteúdo)";
  return `${quota} correção(ões) na compra principal`;
}

export { MIN_KIWIFY_CORRECTION_QUOTA, MAX_CORRECTION_QUOTA };
