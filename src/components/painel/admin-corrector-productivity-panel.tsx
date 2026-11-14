"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { CorrectorProductivityReport } from "@/lib/admin/corrector-productivity-report";
import { addCalendarDays } from "@/lib/admin/month-range-sao-paulo";

type Props = {
  report: CorrectorProductivityReport;
  /** Hoje em America/Sao_Paulo (YYYY-MM-DD), para atalhos de período. */
  todayDate: string;
};

export function AdminCorrectorProductivityPanel({ report, todayDate }: Props) {
  const router = useRouter();
  const [openCorrectorId, setOpenCorrectorId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(report.dateFrom);
  const [dateTo, setDateTo] = useState(report.dateTo);

  useEffect(() => {
    setDateFrom(report.dateFrom);
    setDateTo(report.dateTo);
  }, [report.dateFrom, report.dateTo]);

  function applyRange(from: string, to: string) {
    const params = new URLSearchParams();
    params.set("de", from);
    params.set("ate", to);
    router.push(`/painel/admin/corretores?${params.toString()}`);
  }

  function onFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applyRange(dateFrom, dateTo);
  }

  function applyPreset(preset: "week" | "month") {
    const end = todayDate;
    if (preset === "week") {
      const from = addCalendarDays(end, -6);
      setDateFrom(from);
      setDateTo(end);
      applyRange(from, end);
      return;
    }
    const [y, m] = end.split("-");
    const from = `${y}-${m}-01`;
    setDateFrom(from);
    setDateTo(end);
    applyRange(from, end);
  }

  const periodSummary = useMemo(
    () =>
      `${report.grandTotal.toLocaleString("pt-BR")} correç${
        report.grandTotal === 1 ? "ão" : "ões"
      } no período`,
    [report.grandTotal],
  );

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onFilterSubmit} className="panel-card flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Data inicial
            <input
              type="date"
              className="field-input min-w-[11rem]"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Data final
            <input
              type="date"
              className="field-input min-w-[11rem]"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              required
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="btn-primary btn-sm">
            Filtrar
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={() => applyPreset("week")}>
            Últimos 7 dias
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={() => applyPreset("month")}>
            Mês atual
          </button>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-foreground">{report.periodLabel}</p>
          <p className="text-muted">{periodSummary}</p>
        </div>
      </form>

      {report.rows.length === 0 ? (
        <p className="panel-card text-sm text-muted">
          Nenhum corretor cadastrado ou nenhuma correção neste período.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {report.rows.map((row) => {
            const open = openCorrectorId === row.correctorId;
            return (
              <li key={row.correctorId} className="panel-card flex flex-col gap-4">
                <CorrectorCard
                  row={row}
                  open={open}
                  onToggle={() => setOpenCorrectorId(open ? null : row.correctorId)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CorrectorCard({
  row,
  open,
  onToggle,
}: {
  row: CorrectorProductivityReport["rows"][number];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{row.correctorName}</h2>
          <p className="mt-1 text-sm text-muted">
            <span className="font-medium text-foreground">
              {row.totalInPeriod.toLocaleString("pt-BR")}
            </span>{" "}
            {row.totalInPeriod === 1 ? "correção" : "correções"} no período
          </p>
        </div>
        <button type="button" className="btn-secondary btn-sm" onClick={onToggle} aria-expanded={open}>
          {open ? "Ocultar alunos" : "Ver alunos corrigidos"}
        </button>
      </div>

      {row.byEdital.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Por edital</p>
          <ul className="mt-2 flex flex-col gap-2">
            {row.byEdital.map((item) => (
              <li
                key={item.editalId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm"
              >
                <span className="font-medium">{item.editalTitle}</span>
                <span className="tabular-nums text-muted">{item.count.toLocaleString("pt-BR")}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted">Nenhuma correção no período selecionado.</p>
      )}

      {open ? (
        <div className="rounded-xl border border-purple/30 bg-black/20 p-4">
          <p className="text-sm font-semibold text-purple">Alunos atendidos no período</p>
          {row.byMember.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Sem alunos neste período.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-4">
              {row.byMember.map((member) => (
                <li
                  key={member.memberId}
                  className="rounded-lg border border-white/10 bg-field/30 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{member.memberName}</p>
                    <p className="text-sm tabular-nums text-muted">
                      {member.total.toLocaleString("pt-BR")}{" "}
                      {member.total === 1 ? "correção" : "correções"}
                    </p>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1.5 border-t border-white/8 pt-2 text-sm">
                    {member.byEdital.map((edital) => (
                      <li
                        key={`${member.memberId}-${edital.editalId}`}
                        className="flex justify-between gap-2 text-muted"
                      >
                        <span>{edital.editalTitle}</span>
                        <span className="tabular-nums text-foreground">
                          {edital.count.toLocaleString("pt-BR")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </>
  );
}