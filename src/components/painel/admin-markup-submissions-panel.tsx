"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { MarkupSubmissionRow } from "@/lib/admin/markup-submissions-report";
import { formatCorrectorDateTime } from "@/lib/corrector/submission-row-utils";

type Props = {
  rows: MarkupSubmissionRow[];
};

function statusLabel(status: string) {
  if (status === "corrigido") return "Corrigido";
  if (status === "em_correcao") return "Em correção";
  if (status === "enviado") return "Enviado";
  return status;
}

export function AdminMarkupSubmissionsPanel({ rows }: Props) {
  const [query, setQuery] = useState("");
  const [onlyPdf, setOnlyPdf] = useState(false);
  const [onlyBusy, setOnlyBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (onlyPdf && row.fileKind !== "pdf") return false;
      if (onlyBusy && !row.highActivity) return false;
      if (!q) return true;
      return (
        row.memberName.toLowerCase().includes(q) ||
        (row.originalFilename?.toLowerCase().includes(q) ?? false) ||
        row.phaseTitle.toLowerCase().includes(q) ||
        row.editalTitle.toLowerCase().includes(q) ||
        row.submissionId.toLowerCase().includes(q)
      );
    });
  }, [onlyBusy, onlyPdf, query, rows]);

  return (
    <div className="flex flex-col gap-4">
      <div className="panel-card flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-2 text-sm font-medium">
          Buscar (aluna, arquivo, tema, id)
          <input
            type="search"
            className="field-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex.: CamScanner, Isabel…"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyPdf} onChange={(e) => setOnlyPdf(e.target.checked)} />
          Só PDF
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyBusy} onChange={(e) => setOnlyBusy(e.target.checked)} />
          Muitos grifos
        </label>
      </div>

      <p className="text-sm text-muted">
        {filtered.length} envio(s) com marcação. Use{" "}
        <strong className="font-medium text-foreground">Abrir marcação</strong> para ver o que o corretor
        viu;{" "}
        <strong className="font-medium text-foreground">Preview</strong> abre o arquivo em nova aba.
      </p>

      {filtered.length === 0 ? (
        <p className="panel-card text-sm text-muted">Nenhum envio encontrado com os filtros atuais.</p>
      ) : (
        <div className="panel-card overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-muted">
                <th className="px-2 py-3 font-medium">Aluna</th>
                <th className="px-2 py-3 font-medium">Arquivo</th>
                <th className="px-2 py-3 font-medium">Tipo</th>
                <th className="px-2 py-3 font-medium">Grifos</th>
                <th className="px-2 py-3 font-medium">Rotação</th>
                <th className="px-2 py-3 font-medium">Status</th>
                <th className="px-2 py-3 font-medium">Marcação</th>
                <th className="px-2 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.submissionId}
                  className={`border-b border-white/5 align-top ${
                    row.highActivity ? "bg-amber-500/5" : ""
                  }`}
                >
                  <td className="px-2 py-3">
                    <p className="font-medium">{row.memberName}</p>
                    <p className="mt-0.5 text-xs text-muted">{row.editalTitle}</p>
                    <p className="text-xs text-muted">{row.phaseTitle}</p>
                  </td>
                  <td className="px-2 py-3">
                    <p className="max-w-[14rem] break-words font-mono text-xs">
                      {row.originalFilename ?? "—"}
                    </p>
                    {row.fileSizeKb != null ? (
                      <p className="text-xs text-muted">{row.fileSizeKb} KB</p>
                    ) : null}
                  </td>
                  <td className="px-2 py-3 capitalize">{row.fileKind}</td>
                  <td className="px-2 py-3 tabular-nums">{row.markupCount}</td>
                  <td className="px-2 py-3 tabular-nums">
                    {row.imageRotation ? `${row.imageRotation}°` : "—"}
                  </td>
                  <td className="px-2 py-3">{statusLabel(row.status)}</td>
                  <td className="px-2 py-3 text-xs text-muted">
                    {formatCorrectorDateTime(row.markupUpdatedAt)}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-col gap-1.5">
                      <Link
                        href={`/painel/correcoes/${row.submissionId}/anotar`}
                        className="text-purple hover:underline"
                      >
                        Abrir marcação
                      </Link>
                      <Link
                        href={`/painel/correcoes/${row.submissionId}`}
                        className="text-muted hover:text-foreground hover:underline"
                      >
                        Correção
                      </Link>
                      <a
                        href={`/api/submissions/${row.submissionId}/preview`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted hover:text-foreground hover:underline"
                      >
                        Preview
                      </a>
                      <a
                        href={`/api/submissions/${row.submissionId}/download`}
                        className="text-muted hover:text-foreground hover:underline"
                      >
                        Baixar
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}