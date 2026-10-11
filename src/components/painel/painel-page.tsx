type PainelPageProps = {
  children: React.ReactNode;
  className?: string;
  gap?: "sm" | "md" | "lg";
};

const GAP_CLASS = {
  sm: "gap-6",
  md: "gap-8",
  lg: "gap-10",
} as const;

/** Largura total do shell do painel — evita conteúdo colado à esquerda. */
export function PainelPage({ children, className = "", gap = "md" }: PainelPageProps) {
  return (
    <section className={`flex w-full flex-col ${GAP_CLASS[gap]} ${className}`.trim()}>
      {children}
    </section>
  );
}
