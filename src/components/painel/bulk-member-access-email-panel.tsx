"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sendBulkMemberAccessEmails } from "@/app/actions/member-access";
import type { BulkMemberAccessEmailStatus } from "@/lib/admin/bulk-member-access-email";

type BulkMemberAccessEmailPanelProps = {
  initialStatus: BulkMemberAccessEmailStatus;
};

export function BulkMemberAccessEmailPanel({ initialStatus }: BulkMemberAccessEmailPanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSend() {
    const maxNow = Math.min(status.remainingToday, status.eligibleCount);
    if (maxNow <= 0) {
      setError(
        status.remainingToday <= 0
          ? "Limite diário de envios em massa já foi usado hoje."
          : "Não há membros elegíveis para envio.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Enviar até ${maxNow} e-mail(s) de acesso agora?\n\n` +
        `• Só quem NUNCA recebeu e-mail de acesso com sucesso\n` +
        `• Só quem NUNCA fez login na plataforma\n` +
        `• Cada um recebe uma senha temporária NOVA\n\n` +
        `Limite hoje: ${status.dailyLimit} (restam ${status.remainingToday} neste lote diário).`,
    );
    if (!confirmed) return;

    setPending(true);
    setError("");
    setMessage("");

    const result = await sendBulkMemberAccessEmails();
    setPending(false);

    if (!result.ok || !result.result) {
      setError(
        result.ok ? "Resposta inválida do servidor." : (result.message ?? "Erro ao enviar."),
      );
      return;
    }

    const r = result.result;
    setMessage(
      `Enviados: ${r.sent}. Falhas: ${r.failed}. ` +
        `Ainda elegíveis: ${r.eligibleRemaining}. ` +
        `Restam hoje no lote: ${r.remainingToday}.` +
        (r.skippedLimit > 0
          ? ` (${r.skippedLimit} aguardam próximos dias pelo limite diário.)`
          : ""),
    );

    setStatus((prev) => ({
      ...prev,
      sentToday: r.sentToday,
      remainingToday: r.remainingToday,
      eligibleCount: r.eligibleRemaining,
    }));

    router.refresh();
  }

  return (
    <section className="panel-card border-purple/25 bg-purple/5">
      <h2 className="text-lg font-semibold">E-mails de acesso em massa</h2>
      <p className="mt-1 text-sm text-muted">
        Para alunos que ainda não receberam o e-mail de boas-vindas e nunca entraram na plataforma.
        Limite de <strong className="text-foreground">{status.dailyLimit}</strong> envios em massa por
        dia (dia {status.dayLabel}, fuso Brasília).
      </p>

      <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <li className="rounded-xl border border-white/10 bg-field/50 px-3 py-2">
          <p className="text-xs text-muted">Elegíveis agora</p>
          <p className="text-xl font-semibold tabular-nums">{status.eligibleCount}</p>
        </li>
        <li className="rounded-xl border border-white/10 bg-field/50 px-3 py-2">
          <p className="text-xs text-muted">Enviados hoje (lote)</p>
          <p className="text-xl font-semibold tabular-nums">{status.sentToday}</p>
        </li>
        <li className="rounded-xl border border-white/10 bg-field/50 px-3 py-2">
          <p className="text-xs text-muted">Restam hoje (lote)</p>
          <p className="text-xl font-semibold tabular-nums">{status.remainingToday}</p>
        </li>
        <li className="rounded-xl border border-white/10 bg-field/50 px-3 py-2">
          <p className="text-xs text-muted">Próximo clique envia até</p>
          <p className="text-xl font-semibold tabular-nums">
            {Math.min(status.remainingToday, status.eligibleCount)}
          </p>
        </li>
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={pending || status.remainingToday <= 0 || status.eligibleCount <= 0}
          onClick={onSend}
        >
          {pending ? "Enviando..." : "Enviar lote de acesso (até o limite de hoje)"}
        </button>
      </div>

      {error ? <p className="alert-error mt-3 text-sm">{error}</p> : null}
      {message ? <p className="alert-success mt-3 text-sm">{message}</p> : null}
    </section>
  );
}
