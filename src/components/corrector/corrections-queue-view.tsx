"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PendingSubmissionListRow } from "@/lib/corrector/pending-queue";
import {
  buildEditalQueueSummaries,
  filterPendingSubmissions,
  type CorrectorQueueFilters,
  type QueueAssignmentFilter,
} from "@/lib/corrector/queue-summaries";
import { themeLabel } from "@/lib/editais/theme-label";

type CorrectionsQueueViewProps = {
  submissions: PendingSubmissionListRow[];
  viewerId: string;
  viewerRole: string;
};

const defaultFilters: CorrectorQueueFilters = {
  editalId: "",
  cargoId: "",
  submissionKind: "all",
  assignment: "all",
  memberQuery: "",
};

const assignmentOptions: { value: QueueAssignmentFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "livre", label: "Ninguém pegou" },
  { value: "comigo", label: "Com você" },
  { value: "outros", label: "Com colega" },
];

function formatDeadline(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function QueueStatusBadge({
  submission,
  viewerId,
}: {
  submission: PendingSubmissionListRow;
  viewerId: string;
}) {
  if (!submission.assigned_corrector_id) {
    return (
      <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs font-medium text-muted">
        Aguardando correção
      </span>
    );
  }

  if (submission.assigned_corrector_id === viewerId) {
    return (
      <span className="rounded-full bg-purple/20 px-2 py-0.5 text-xs font-medium text-purple">
        Em correção · com você
      </span>
    );
  }

  const name = submission.assignedCorrectorName?.trim() || "outro corretor";
  return (
    <span className="rounded-full border border-purple/30 bg-white/5 px-2 py-0.5 text-xs font-medium text-beige">
      Em correção · {name}
    </span>
  );
}

export function CorrectionsQueueView({
  submissions,
  viewerId,
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
    () => filterPendingSubmissions(submissions, filters, viewerId),
    [submissions, filters, viewerId],
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
    filters.assignment !== "all" ||
    filters.memberQuery.trim();

  const compactField = "field-input h-9 py-1.5 text-sm";

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Controle por edital</h2>
        <p className="text-sm text-muted">
          Redações pendentes e prazo do tema mais próximo em cada edital.
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

      <section className="panel-card flex flex-col gap-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Filtros</p>
          <p className="text-xs text-muted">
            <strong className="text-beige">{filtered.length}</strong> de {submissions.length}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {assignmentOptions.map((opt) => {
            const active = filters.assignment === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className={
                  active
                    ? "rounded-full bg-purple/25 px-3 py-1 text-xs font-semibold text-purple"
                    : "rounded-full border border-white/12 px-3 py-1 text-xs font-medium text-muted transition hover:border-white/25 hover:text-foreground"
                }
                onClick={() =>
                  setFilters((prev) => ({ ...prev, assignment: opt.value }))
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-xs font-medium text-muted">
            Edital
            <select
              className={compactField}
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

          <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-xs font-medium text-muted">
            Cargo
            <select
              className={compactField}
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

          <label className="flex min-w-[7rem] flex-col gap-1 text-xs font-medium text-muted">
            Envio
            <select
              className={compactField}
              value={filters.submissionKind}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  submissionKind: e.target.value as CorrectorQueueFilters["submissionKind"],
                }))
              }
            >
              <option value="all">Todos</option>
              <option value="primeiro">1º envio</option>
              <option value="reenvio">Reenvio</option>
            </select>
          </label>

          <label className="flex min-w-[10rem] flex-[2] flex-col gap-1 text-xs font-medium text-muted">
            Aluno
            <input
              type="search"
              className={compactField}
              placeholder="Buscar nome"
              value={filters.memberQuery}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, memberQuery: e.target.value }))
              }
            />
          </label>

          {hasActiveFilters ? (
            <button
              type="button"
              className="btn-secondary btn-sm h-9 shrink-0 px-3 text-xs"
              onClick={clearFilters}
            >
              Limpar
            </button>
          ) : null}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((submission) => {
          const withOtherCorrector =
            submission.assigned_corrector_id &&
            submission.assigned_corrector_id !== viewerId;

          return (
            <article key={submission.id} className="panel-card flex flex-col gap-2">
              <Link
                href={`/painel/correcoes/${submission.id}`}
                className={`transition hover:opacity-90 ${withOtherCorrector ? "opacity-90" : ""}`}
                title={
                  withOtherCorrector
                    ? "Atividade reservada para outro corretor — ao abrir, você verá aviso."
                    : undefined
                }
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
                  <QueueStatusBadge submission={submission} viewerId={viewerId} />
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
                  Enviado em {new Date(submission.submitted_at).toLocaleString("pt-BR")}
                  {submission.phaseDeadlineAt ? (
                    <>
                      {" "}
                      · Prazo do tema: {formatDeadline(submission.phaseDeadlineAt)}
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
