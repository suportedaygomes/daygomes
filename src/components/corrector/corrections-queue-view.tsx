"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PendingSubmissionListRow } from "@/lib/corrector/pending-queue";
import {
  buildEditalQueueSummaries,
  filterPendingSubmissions,
  type CorrectorQueueFilters,
} from "@/lib/corrector/queue-summaries";

type CorrectionsQueueViewProps = {
  submissions: PendingSubmissionListRow[];
  viewerId: string;
  viewerRole: string;
};

const defaultFilters: CorrectorQueueFilters = {
  editalId: "",
  cargoId: "",
  submissionKind: "all",
  memberQuery: "",
};

function formatDeadline(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function CorrectionsQueueView({
  submissions,
  viewerId,
  viewerRole,
}: CorrectionsQueueViewProps) {
  const [filters, setFilters] = useState<CorrectorQueueFilters>(defaultFilters);

  const summaries = useMemo(() => buildEditalQueueSummaries(submissions), [submissions]);

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

  const filtered = useMemo(
    () => filterPendingSubmissions(submissions, filters),
    [submissions, filters],
  );

  function setEditalId(editalId: string) {
    setFilters((prev) => ({
      ...prev,
      editalId,
      cargoId: "",
    }));
  }

  function clearFilters() {
    setFilters(defaultFilters);
  }

  const hasActiveFilters =
    filters.editalId ||
    filters.cargoId ||
    filters.submissionKind !== "all" ||
    filters.memberQuery.trim();

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Controle por edital</h2>
        <p className="text-sm text-muted">
          Redações aguardando correção e prazo da fase mais próximo em cada edital.
        </p>
        <div className="grid gap-3 lg:grid-cols-2">
          {summaries.map((summary) => (
            <article
              key={summary.editalId}
              className="panel-card flex flex-col gap-3 border-white/10"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{summary.editalTitle}</p>
                  <p className="mt-1 text-sm text-muted">
                    <strong className="text-beige">{summary.pendingCount}</strong>
                    {summary.pendingCount === 1
                      ? " redação pendente"
                      : " redações pendentes"}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs font-medium text-purple hover:underline"
                  onClick={() => setEditalId(summary.editalId)}
                >
                  Filtrar edital
                </button>
              </div>
              <p className="text-xs text-muted">
                Prazo mais próximo:{" "}
                <span className="text-beige">{formatDeadline(summary.nearestDeadlineAt)}</span>
              </p>
              <ul className="flex flex-col gap-1 border-t border-white/10 pt-3 text-xs text-muted">
                {summary.cargos.map((cargo) => (
                  <li key={cargo.cargoId} className="flex flex-wrap justify-between gap-2">
                    <span>{cargo.cargoName}</span>
                    <span>
                      {cargo.pendingCount} · fecha {formatDeadline(cargo.nearestDeadlineAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
          {!summaries.length ? (
            <p className="text-sm text-muted">Nenhum edital com correções pendentes.</p>
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
            Tipo de envio
            <select
              className="field-input"
              value={filters.submissionKind}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  submissionKind: e.target.value as CorrectorQueueFilters["submissionKind"],
                }))
              }
            >
              <option value="all">Todos</option>
              <option value="primeiro">Primeiro envio</option>
              <option value="reenvio">Reenvio</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2 lg:col-span-1">
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
          <button
            type="button"
            className="btn-secondary btn-sm w-fit"
            onClick={clearFilters}
          >
            Limpar filtros
          </button>
        ) : null}

        <p className="text-sm text-muted">
          Mostrando <strong className="text-beige">{filtered.length}</strong> de{" "}
          {submissions.length} na fila
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((submission) => {
          const isMine =
            submission.assigned_corrector_id === viewerId ||
            (viewerRole === "admin" && submission.status === "em_correcao");

          return (
            <article key={submission.id} className="panel-card flex flex-col gap-2">
              <Link
                href={`/painel/correcoes/${submission.id}`}
                className="transition hover:opacity-90"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{submission.memberName}</p>
                  {submission.isResubmit ? (
                    <span className="badge-sky">Reenvio</span>
                  ) : (
                    <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-muted">
                      1º envio
                    </span>
                  )}
                  {submission.status === "em_correcao" && isMine ? (
                    <span className="rounded-full bg-purple/20 px-2 py-0.5 text-xs font-medium text-purple">
                      Com você
                    </span>
                  ) : submission.status === "enviado" && !submission.assigned_corrector_id ? (
                    <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-muted">
                      Na fila
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm font-medium text-purple/90">
                  {submission.editalTitle}
                </p>
                <p className="text-sm text-muted">
                  {submission.cargoName} · {submission.phaseTitle} · Fase{" "}
                  {submission.phaseNumber ?? "—"}
                </p>
                <p className="mt-2 text-xs text-muted">
                  Enviado em {new Date(submission.submitted_at).toLocaleString("pt-BR")}
                  {submission.phaseDeadlineAt ? (
                    <>
                      {" "}
                      · Prazo da fase: {formatDeadline(submission.phaseDeadlineAt)}
                    </>
                  ) : null}
                </p>
              </Link>
              <Link
                href={`/painel/membros/${submission.member_id}`}
                className="text-xs font-medium text-purple hover:underline"
              >
                Contato do aluno
              </Link>
            </article>
          );
        })}
        {!filtered.length ? (
          <p className="text-sm text-muted sm:col-span-2">
            {submissions.length
              ? "Nenhum envio corresponde aos filtros."
              : "Nenhum envio pendente de correção."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
