"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteUserAsAdmin } from "@/app/actions/admin-users";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Props = {
  userId: string;
  displayName: string;
  currentAdminId: string;
  /** Após excluir, redireciona (ex.: volta à lista de membros). */
  redirectTo?: string;
  className?: string;
  compact?: boolean;
};

export function DeletePlatformUserButton({
  userId,
  displayName,
  currentAdminId,
  redirectTo,
  className = "",
  compact = false,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");

  const isSelf = userId === currentAdminId;

  async function onConfirm() {
    setConfirmOpen(false);
    setError("");
    setPending(true);

    const result = await deleteUserAsAdmin(userId);
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    if (redirectTo) {
      router.push(redirectTo);
    }
    router.refresh();
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`.trim()}>
      <button
        type="button"
        className={
          compact
            ? "text-action-danger text-xs font-medium disabled:opacity-50"
            : "btn-secondary w-fit border-red-400/30 text-red-200 hover:border-red-400/50"
        }
        disabled={isSelf || pending}
        title={isSelf ? "Você não pode excluir sua própria conta." : undefined}
        onClick={() => setConfirmOpen(true)}
      >
        {pending ? "Excluindo..." : compact ? "Excluir" : "Excluir usuário permanentemente"}
      </button>
      {!compact ? (
        <p className="text-xs text-muted">
          Remove login, inscrições e envios deste aluno. Não dá para desfazer.
        </p>
      ) : null}
      {error ? <p className="alert-error text-sm">{error}</p> : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir usuário permanentemente?"
        danger
        confirmLabel="Excluir para sempre"
        pending={pending}
        description={
          <>
            <strong className="text-foreground">{displayName}</strong> perderá o acesso à plataforma.
            Inscrições em editais e histórico de envios deste membro serão apagados.
          </>
        }
        onConfirm={onConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}