"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { resendMemberAccessEmail } from "@/app/actions/member-access";

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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onClick() {
    if (!memberEmail?.trim()) {
      setError("Este membro não tem e-mail cadastrado.");
      return;
    }

    const confirmed = window.confirm(
      `Gerar uma nova senha aleatória e enviar por e-mail para ${memberEmail}?\n\nA senha anterior deixa de valer.`,
    );
    if (!confirmed) return;

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
        onClick={onClick}
      >
        {pending ? "Enviando..." : "Reenviar acesso com nova senha"}
      </button>
      <p className="text-xs text-muted">
        Gera senha temporária nova e envia ao e-mail do aluno (não exibe a senha aqui).
      </p>
      {error ? <p className="alert-error text-sm">{error}</p> : null}
      {message ? <p className="alert-success text-sm">{message}</p> : null}
    </div>
  );
}
