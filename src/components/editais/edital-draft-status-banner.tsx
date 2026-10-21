type Props = {
  draftUpdatedAt: string | null;
  publishedRevisionMismatch: boolean;
  children?: React.ReactNode;
};

export function EditalDraftStatusBanner({
  draftUpdatedAt,
  publishedRevisionMismatch,
  children,
}: Props) {
  const label = draftUpdatedAt
    ? new Date(draftUpdatedAt).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : null;

  return (
    <div
      role="status"
      className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100"
    >
      <p className="font-semibold text-amber-50">Rascunho não publicado</p>
      <p className="mt-1 text-amber-100/90">
        Alunos ainda veem a versão publicada
        {label ? ` · salvo no servidor: ${label}` : ""}. Sincroniza entre dispositivos.
      </p>
      {publishedRevisionMismatch ? (
        <p className="mt-2 text-amber-100/90">
          A versão publicada mudou desde que este rascunho começou. Revise antes de publicar ou
          cancele para voltar ao que está no site.
        </p>
      ) : null}
      {children}
    </div>
  );
}
