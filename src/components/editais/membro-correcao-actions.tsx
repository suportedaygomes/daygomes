"use client";

import Link from "next/link";

type MembroCorrecaoActionsProps = {
  submissionId: string;
};

export function MembroCorrecaoActions({ submissionId }: MembroCorrecaoActionsProps) {
  return (
    <div className="flex flex-wrap gap-3 print:hidden">
      <a
        href={`/api/submissions/${submissionId}/download`}
        className="btn-secondary btn-sm"
        target="_blank"
        rel="noreferrer"
      >
        Baixar meu envio original
      </a>
      <button type="button" className="btn-primary btn-sm btn-flat" onClick={() => window.print()}>
        Imprimir / salvar correção marcada
      </button>
    </div>
  );
}

export function MembroCorrecaoCardActions({ submissionId }: MembroCorrecaoActionsProps) {
  return (
    <div className="mt-4 grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-2">
      <Link
        href={`/painel/editais/correcao/${submissionId}`}
        className="btn-primary btn-sm btn-flat w-full"
      >
        Ver correção com marcações
      </Link>
      <a
        href={`/api/submissions/${submissionId}/download`}
        className="btn-secondary btn-sm w-full"
        target="_blank"
        rel="noreferrer"
      >
        Baixar meu envio
      </a>
    </div>
  );
}
