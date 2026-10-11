"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { returnSubmissionToCorrectionQueue } from "@/app/actions/corrections";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type ReturnToQueueButtonProps = {
  submissionId: string;
};

export function ReturnToQueueButton({ submissionId }: ReturnToQueueButtonProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function onConfirm() {
    setError("");
    setMessage("");
    setPending(true);

    const result = await returnSubmissionToCorrectionQueue(submissionId);
    if (!result.ok) {
      setError(result.message);
      setPending(false);
      return;
    }

    setConfirmOpen(false);
    setMessage(result.message);
    setPending(false);
    router.push("/painel/correcoes");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        className="btn-secondary btn-sm w-fit"
      >
        {pending ? "Devolvendo..." : "Devolver à fila"}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title="Devolver à fila?"
        description="Outro corretor poderá assumir a correção desta atividade."
        confirmLabel="Devolver"
        cancelLabel="Cancelar"
        pending={pending}
        onConfirm={onConfirm}
        onCancel={() => {
          if (!pending) setConfirmOpen(false);
        }}
      />
      {error ? <p role="alert" className="alert-error text-sm">{error}</p> : null}
      {message ? <p role="status" className="alert-success text-sm">{message}</p> : null}
    </div>
  );
}
