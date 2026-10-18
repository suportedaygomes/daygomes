"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CorrectedSubmissionListRow } from "@/lib/corrector/corrected-queue";
import {
  buildEditalCountSummaries,
  filterCorrectedSubmissions,
  type CorrectedQueueFilters,
} from "@/lib/corrector/queue-summaries";
import { formatCorrectorDateTime } from "@/lib/corrector/submission-row-utils";
import { themeLabel } from "@/lib/editais/theme-label";

type CorrectedSubmissionsViewProps = {
  submissions: CorrectedSubmissionListRow[];
  showCorrectorFilter: boolean;
};

const defaultFilters: CorrectedQueueFilters = {
  editalId: "",
  cargoId: "",
  memberQuery: "",
  resubmitReleased: "all",
  correctorId: "",
};

export function CorrectedSubmissionsView({
  submissions,
  showCorrectorFilter,
}: CorrectedSubmissionsViewProps) {
  const [filters, setFilters] = useState<CorrectedQueueFilters>(defaultFilters);

  const summaries = useMemo(() => buildEditalCountSummaries(submissions), [submissions]);

  const editalOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of submissions) {
      map.set(row.editalId, row.editalTitle);
    }
    return [...map.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  }, [submissions]);

  const cargoOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of submissions) {
      if (filters.editalId && row.editalId !== filters.editalId) continue;
      map.set(row.cargoId, row.cargoName);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [submissions, filters.editalId]);

  const correctorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of submissions) {
      map.set(row.correctorId, row.correctorName);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [submissions]);

  const filtered = useMemo(
    () => filterCorrectedSubmissions(submissions, filters),
    [submissions, filters],
  );

  function setEditalId(editalId: string) {
    setFilters((prev) => ({ ...prev, editalId, cargoId: "" }));
  }

  function clearFilters() {
    setFilters(defaultFilters);
  }

  const hasActiveFilters =
    filters.editalId ||
    filters.cargoId ||
    filters.memberQuery.trim() ||
    filters.resubmitReleased !== "all" ||
    filters.correctorId;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Por edital</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((summary) => (
            <article key={summary.editalId} className="panel-card flex flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold">{summary.editalTitle}</p>
                <button
                  type="button"
                  className="text-xs font-medium text-purple hover:underline"
                  onClick={() => setEditalId(summary.editalId)}
                >
                  Filtrar
                </button>
              </div>
              <p className="text-sm text-muted">
                <strong className="text-beige">{summary.count}</strong>
                {summary.count === 1 ? " corrigida" : " corrigidas"}
              </p>
              <ul className="text-xs text-muted">
                {summary.cargos.map((cargo) => (
                  <li key={cargo.cargoId}>
                    {cargo.cargoName}: {cargo.count}
                  </li>
                ))}
              </ul>
            </article>
          ))}
          {!summaries.length ? (
            <p className="text-sm text-muted">Nenhuma correção registrada ainda.</p>
          ) : null}
        </div>
      </section>

      <section className="panel-card flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Filtros</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Edital
            <select
              className="field-input"
              value={filters.editalId}
              onChange={(e) => setEditalId(e.target.value)}
            >
              <option value="">Todos</option>
              {editalOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.title}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Cargo
            <select
              className="field-input"
              value={filters.cargoId}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, cargoId: e.target.value }))
              }
            >
              <option value="">Todos</option>
              {cargoOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Reenvio liberado
            <select
              className="field-input"
              value={filters.resubmitReleased}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  resubmitReleased: e.target.value as CorrectedQueueFilters["resubmitReleased"],
                }))
              }
            >
              <option value="all">Todos</option>
              <option value="yes">Sim (ainda liberado)</option>
            </select>
          </label>

          {showCorrectorFilter ? (
            <label className="flex flex-col gap-2 text-sm font-medium">
              Corretor
              <select
                className="field-input"
                value={filters.correctorId}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, correctorId: e.target.value }))
                }
              >
                <option value="">Todos</option>
                {correctorOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2 lg:col-span-4">
            Buscar aluno
            <input
              type="search"
              className="field-input"
              placeholder="Nome do membro"
              value={filters.memberQuery}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, memberQuery: e.target.value }))
              }
            />
          </label>
        </div>

        {hasActiveFilters ? (
          <button type="button" className="btn-secondary btn-sm w-fit" onClick={clearFilters}>
            Limpar filtros
          </button>
        ) : null}

        <p className="text-sm text-muted">
          Mostrando <strong className="text-beige">{filtered.length}</strong> de{" "}
          {submissions.length}
          {submissions.length >= 300 ? " (últimas 300 correções)" : ""}
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((submission) => (
          <article key={submission.id} className="panel-card flex flex-col gap-2">
            <Link
              href={`/painel/correcoes/${submission.id}`}
              className="transition hover:opacity-90"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{submission.memberName}</p>
                <span className="badge-grade">
                  Nota {submission.grade ?? "—"}
                </span>
                {submission.allowResubmit ? (
                  <span className="badge-sky">Reenvio liberado</span>
                ) : null}
              </div>
              <p className="mt-1 text-sm font-medium text-purple/90">
                {submission.editalTitle}
              </p>
              <p className="text-sm text-muted">
                {submission.cargoName} · {submission.phaseTitle}
                {submission.phaseNumber != null
                  ? ` · ${themeLabel(submission.phaseNumber)}`
                  : ""}
              </p>
              <p className="mt-2 text-xs text-muted">
                Corrigida em {formatCorrectorDateTime(submission.correctedAt)}
                {showCorrectorFilter ? ` · ${submission.correctorName}` : ""}
              </p>
            </Link>
            <Link
              href={`/painel/membros/${submission.member_id}`}
              className="text-xs font-medium text-purple hover:underline"
            >
              Contato do aluno
            </Link>
          </article>
        ))}
        {!filtered.length ? (
          <p className="text-sm text-muted sm:col-span-2">
            {submissions.length
              ? "Nenhuma correção corresponde aos filtros."
              : "Nenhuma redação corrigida no seu histórico."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
