"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  fetchBulkMemberAccessBatch,
  fetchBulkMemberAccessEmailStatus,
  sendBulkMemberAccessEmailStep,
} from "@/app/actions/member-access";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { BulkMemberAccessEmailStatus } from "@/lib/admin/bulk-member-access-email";

type BulkMemberAccessEmailPanelProps = {
  initialStatus: BulkMemberAccessEmailStatus;
};

type ProgressRow = {
  id: string;
  fullName: string;
  email: string;
  state: "pending" | "sending" | "success" | "error";
  message?: string;
};

type PanelTab = "resumo" | "progresso";

export function BulkMemberAccessEmailPanel({ initialStatus }: BulkMemberAccessEmailPanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [tab, setTab] = useState<PanelTab>("resumo");
  const [running, setRunning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);
  const [runFinished, setRunFinished] = useState(false);

  const maxNow = Math.min(status.remainingToday, status.eligibleCount);

  const progressStats = useMemo(() => {
    const total = progressRows.length;
    const done = progressRows.filter((row) => row.state === "success" || row.state === "error").length;
    const success = progressRows.filter((row) => row.state === "success").length;
    const failed = progressRows.filter((row) => row.state === "error").length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, success, failed, percent };
  }, [progressRows]);

  const showProgressTab = progressRows.length > 0;

  function onRequestSend() {
    if (maxNow <= 0) {
      setError(
        status.remainingToday <= 0
          ? "Limite diário de envios em massa já foi usado hoje."
          : "Não há membros elegíveis para envio.",
      );
      return;
    }
    setConfirmOpen(true);
  }

  async function onConfirmSend() {
    setConfirmOpen(false);
    setError("");
    setMessage("");
    setRunFinished(false);
    setRunning(true);

    const plan = await fetchBulkMemberAccessBatch();
    if (!plan.ok) {
      setRunning(false);
      setError(plan.message ?? "Não foi possível preparar o lote.");
      return;
    }

    const rows: ProgressRow[] = plan.targets.map((target) => ({
      id: target.id,
      fullName: target.fullName,
      email: target.email,
      state: "pending",
    }));

    setProgressRows(rows);
    setTab("progresso");

    let sent = 0;
    let failed = 0;
    let lastRemainingToday = status.remainingToday;
    let lastSentToday = status.sentToday;

    try {
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        setProgressRows((prev) =>
          prev.map((item, i) => (i === index ? { ...item, state: "sending" } : item)),
        );

        const step = await sendBulkMemberAccessEmailStep(row.id);

        if (step.ok) {
          sent += 1;
          lastSentToday = step.sentToday;
          lastRemainingToday = step.remainingToday;
          setProgressRows((prev) =>
            prev.map((item, i) =>
              i === index ? { ...item, state: "success", message: "E-mail enviado" } : item,
            ),
          );
        } else {
          failed += 1;
          const failMessage = step.message ?? "Falha no envio";
          if (failMessage.includes("Limite diário") || failMessage.includes("Resend")) {
            setProgressRows((prev) =>
              prev.map((item, i) =>
                i === index
                  ? { ...item, state: "error", message: failMessage }
                  : i > index && item.state === "pending"
                    ? { ...item, state: "error", message: "Não enviado (limite diário)" }
                    : item,
              ),
            );
            break;
          }
          setProgressRows((prev) =>
            prev.map((item, i) =>
              i === index ? { ...item, state: "error", message: failMessage } : item,
            ),
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    } finally {
      setRunning(false);
      setRunFinished(true);
    }

    const statusRefresh = await fetchBulkMemberAccessEmailStatus();
    if (statusRefresh.ok && statusRefresh.status) {
      setStatus(statusRefresh.status);
    } else {
      setStatus((prev) => ({
        ...prev,
        sentToday: lastSentToday,
        remainingToday: lastRemainingToday,
        eligibleCount: Math.max(0, prev.eligibleCount - sent),
      }));
    }

    setMessage(
      `Lote concluído: ${sent} enviado(s), ${failed} falha(s).` +
        (plan.skippedByLimit > 0
          ? ` ${plan.skippedByLimit} aguardam próximos dias pelo limite diário.`
          : ""),
    );

    router.refresh();
  }

  return (
    <>
      <section className="panel-card border-purple/25 bg-purple/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">E-mails de acesso em massa</h2>
          {showProgressTab ? (
            <div
              className="flex rounded-xl border border-white/10 bg-field/40 p-0.5 text-sm"
              role="tablist"
              aria-label="Seções do envio em massa"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === "resumo"}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  tab === "resumo" ? "bg-purple/30 text-foreground" : "text-muted hover:text-foreground"
                }`}
                onClick={() => setTab("resumo")}
              >
                Resumo
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "progresso"}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  tab === "progresso"
                    ? "bg-purple/30 text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
                onClick={() => setTab("progresso")}
              >
                Progresso do envio
                {running ? "…" : null}
              </button>
            </div>
          ) : null}
        </div>

        {tab === "resumo" ? (
          <>
            <p className="mt-1 text-sm text-muted">
              Para alunos que ainda não receberam o e-mail de boas-vindas e nunca entraram na
              plataforma. Limite de{" "}
              <strong className="text-foreground">{status.dailyLimit}</strong> envios em massa por
              dia (dia {status.dayLabel}, fuso Brasília).
            </p>

            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <li className="rounded-xl border border-white/10 bg-field/50 px-3 py-2">
                <p className="text-xs text-muted">Elegíveis agora</p>
                <p className="text-xl font-semibold tabular-nums">{status.eligibleCount}</p>
              </li>
              <li className="rounded-xl border border-white/10 bg-field/50 px-3 py-2">
                <p className="text-xs text-muted">Enviados hoje (lote)</p>
                <p className="text-xl font-semibold tabular-nums">{status.sentToday}</p>
              </li>
              <li className="rounded-xl border border-white/10 bg-field/50 px-3 py-2">
                <p className="text-xs text-muted">Próximo clique envia até</p>
                <p className="text-xl font-semibold tabular-nums">{maxNow}</p>
              </li>
              <li className="rounded-xl border border-white/10 bg-field/50 px-3 py-2 sm:col-span-2 lg:col-span-3">
                <p className="text-xs text-muted">Resend hoje (todos os e-mails de acesso)</p>
                <p className="text-lg font-semibold tabular-nums">
                  {status.resendAccessSentToday} / {status.resendDailyLimit}
                  <span className="ml-2 text-sm font-normal text-muted">
                    (restam {status.resendRemainingToday} para novo lote)
                  </span>
                </p>
              </li>
            </ul>

            {status.resendRemainingToday <= 0 ? (
              <p className="alert-error mt-3 text-sm">
                Limite diário do Resend atingido. Os próximos envios falham até amanhã (fuso Brasília).
                No painel do Resend, “Sent” ainda pode virar “Delivered” em alguns minutos.
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn-primary"
                disabled={running || status.remainingToday <= 0 || status.eligibleCount <= 0}
                onClick={onRequestSend}
              >
                {running ? "Envio em andamento…" : "Enviar lote de acesso (até o limite de hoje)"}
              </button>
              {showProgressTab && !running ? (
                <button type="button" className="btn-secondary btn-sm" onClick={() => setTab("progresso")}>
                  Ver último progresso
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <div className="mt-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {running ? "Enviando e-mails…" : runFinished ? "Envio finalizado" : "Progresso"}
                </p>
                <p className="text-xs text-muted">
                  {progressStats.done} de {progressStats.total} processados · {progressStats.success}{" "}
                  ok · {progressStats.failed} erro(s)
                </p>
              </div>
              <p className="text-2xl font-semibold tabular-nums text-purple-200">
                {progressStats.percent}%
              </p>
            </div>

            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-field/80"
              role="progressbar"
              aria-valuenow={progressStats.percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-purple transition-[width] duration-300"
                style={{ width: `${progressStats.percent}%` }}
              />
            </div>

            <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-field/30 p-2 text-sm">
              {progressRows.map((row) => (
                <li
                  key={row.id}
                  className={`flex flex-wrap items-start justify-between gap-2 rounded-lg px-3 py-2 ${
                    row.state === "success"
                      ? "bg-emerald-500/10"
                      : row.state === "error"
                        ? "bg-red-500/10"
                        : row.state === "sending"
                          ? "bg-purple/15"
                          : "bg-transparent"
                  }`}
                >
                  <div>
                    <p className="font-medium">{row.fullName}</p>
                    <p className="text-xs text-muted">{row.email}</p>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      row.state === "success"
                        ? "text-emerald-300"
                        : row.state === "error"
                          ? "text-red-300"
                          : row.state === "sending"
                            ? "text-purple-200"
                            : "text-muted"
                    }`}
                  >
                    {row.state === "pending"
                      ? "Na fila"
                      : row.state === "sending"
                        ? "Enviando…"
                        : row.state === "success"
                          ? "Enviado"
                          : row.message ?? "Erro"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error ? <p className="alert-error mt-3 text-sm">{error}</p> : null}
        {message ? <p className="alert-success mt-3 text-sm">{message}</p> : null}
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title={`Enviar até ${maxNow} e-mail(s) de acesso?`}
        description={
          <>
            <ul className="list-disc space-y-1 pl-5">
              <li>Só quem nunca recebeu e-mail de acesso com sucesso</li>
              <li>Só quem nunca fez login na plataforma</li>
              <li>Cada um recebe uma senha temporária nova</li>
            </ul>
            <p className="mt-3">
              Limite hoje: {status.dailyLimit} (restam {status.remainingToday} neste lote diário). O
              progresso será exibido na aba &quot;Progresso do envio&quot;.
            </p>
          </>
        }
        confirmLabel="Iniciar envio"
        pending={running}
        onConfirm={onConfirmSend}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
