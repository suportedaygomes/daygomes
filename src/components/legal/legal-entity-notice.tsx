import {
  LEGAL_CNPJ,
  LEGAL_CONTACT_EMAIL,
  LEGAL_ENTITY_NAME,
  SITE_DISPLAY_NAME,
} from "@/lib/legal/site";

type LegalEntityNoticeProps = {
  className?: string;
  compact?: boolean;
};

/** Razão social visível na web (ex.: verificação Meta / site associado ao negócio). */
export function LegalEntityNotice({ className = "", compact = false }: LegalEntityNoticeProps) {
  if (compact) {
    return (
      <p className={`text-center text-xs leading-relaxed text-muted ${className}`}>
        <span className="text-foreground/90">{SITE_DISPLAY_NAME}</span>
        {" · operado por "}
        <span className="text-foreground/90">{LEGAL_ENTITY_NAME}</span>
        {" · CNPJ "}
        <span className="text-foreground/90">{LEGAL_CNPJ}</span>
      </p>
    );
  }

  return (
    <aside
      className={`rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-xs leading-relaxed text-muted ${className}`}
      aria-label="Dados do titular do serviço"
    >
      <p className="font-medium text-foreground/90">{LEGAL_ENTITY_NAME}</p>
      <p className="mt-1">CNPJ {LEGAL_CNPJ}</p>
      <p className="mt-2">
        Marca e plataforma <strong className="font-medium text-foreground/90">{SITE_DISPLAY_NAME}</strong>
        {" · "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-purple hover:underline">
          {LEGAL_CONTACT_EMAIL}
        </a>
      </p>
    </aside>
  );
}
