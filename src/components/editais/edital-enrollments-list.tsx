"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export type EditalEnrollmentRow = {
  id: string;
  correctionQuota: number;
  memberName: string;
  memberEmail: string;
};

type EditalEnrollmentsListProps = {
  editalId: string;
  enrollments: EditalEnrollmentRow[];
};

type UnenrollTarget = { id: string; memberName: string };

export function EditalEnrollmentsList({ editalId, enrollments }: EditalEnrollmentsListProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<UnenrollTarget | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function confirmUnenroll() {
    if (!confirmTarget) return;
    const { id: enrollmentId } = confirmTarget;
    setConfirmTarget(null);
    setError("");
    setMessage("");
    setPendingId(enrollmentId);

    try {
      const response = await fetch(
        `/api/admin/editais/${editalId}/enrollments/${enrollmentId}`,
        { method: "DELETE" },
      );
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
      } | null;

      if (!response.ok || !result?.ok) {
        setError(result?.message ?? "Não foi possível desvincular.");
        return;
      }

      setMessage(result.message ?? "Membro desvinculado.");
      router.refresh();
    } catch {
      setError("Não foi possível desvincular. Verifique a conexão.");
    } finally {
      setPendingId(null);
    }
  }

  if (!enrollments.length) {
    return <p className="text-sm text-muted">Nenhum membro vinculado.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <p className="alert-error">{error}</p> : null}
      {message ? <p className="alert-success">{message}</p> : null}
      <ul className="flex flex-col gap-2">
        {enrollments.map((row) => (
          <li
            key={row.id}
            className="panel-card flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0 text-sm">
              <p className="font-medium">{row.memberName}</p>
              <p className="text-muted">
                {row.memberEmail} · {row.correctionQuota} correção(ões) no plano
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary btn-sm shrink-0 text-xs"
              disabled={pendingId === row.id}
              onClick={() => setConfirmTarget({ id: row.id, memberName: row.memberName })}
            >
              {pendingId === row.id ? "Desvinculando..." : "Desvincular"}
            </button>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title="Desvincular membro?"
        description={
          confirmTarget ? (
            <>
              Remover <strong className="text-foreground">{confirmTarget.memberName}</strong> desta
              mentoria? Se for o único acesso com correção, o login na plataforma será removido.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Desvincular"
        danger
        pending={Boolean(pendingId)}
        onConfirm={confirmUnenroll}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
