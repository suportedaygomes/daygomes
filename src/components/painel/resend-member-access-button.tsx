"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { resendMemberAccessEmail } from "@/app/actions/member-access";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type ResendMemberAccessButtonProps = {
  memberId: string;
  memberEmail: string | null;
};

export function ResendMemberAccessButton({
  memberId,
  memberEmail,
}: ResendMemberAccessButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function onRequest() {
    if (!memberEmail?.trim()) {
      setError("Este membro não tem e-mail cadastrado.");
      return;
    }
    setConfirmOpen(true);
  }

  async function onConfirm() {
    setConfirmOpen(false);
    setPending(true);
    setError("");
    setMessage("");

    const result = await resendMemberAccessEmail(memberId);
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(result.message);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="btn-primary btn-sm w-fit"
        disabled={pending || !memberEmail?.trim()}
        onClick={onRequest}
      >
        {pending ? "Enviando..." : "Reenviar acesso com nova senha"}
      </button>
      <p className="text-xs text-muted">
        Gera senha temporária nova e envia ao e-mail do aluno (não exibe a senha aqui).
      </p>
      {error ? <p className="alert-error text-sm">{error}</p> : null}
      {message ? <p className="alert-success text-sm">{message}</p> : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Reenviar acesso com nova senha?"
        description={
          <>
            Será gerada uma senha aleatória nova e enviada para{" "}
            <strong className="text-foreground">{memberEmail}</strong>. A senha anterior deixa de
            valer.
          </>
        }
        confirmLabel="Enviar e-mail"
        pending={pending}
        onConfirm={onConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
