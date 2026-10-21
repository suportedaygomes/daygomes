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
    <div role="status" className="alert-warning">
      <p className="font-semibold">Rascunho não publicado</p>
      <p className="mt-1">
        Alunos ainda veem a versão publicada
        {label ? ` · salvo no servidor: ${label}` : ""}. Sincroniza entre dispositivos.
      </p>
      {publishedRevisionMismatch ? (
        <p className="mt-2">
          A versão publicada mudou desde que este rascunho começou. Revise antes de publicar ou
          cancele para voltar ao que está no site.
        </p>
      ) : null}
      {children}
    </div>
  );
}
