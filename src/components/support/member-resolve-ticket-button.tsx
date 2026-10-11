"use client";

import { useState } from "react";
import { memberResolveSupportTicket } from "@/app/actions/support";

type MemberResolveTicketButtonProps = {
  ticketId: string;
};

export function MemberResolveTicketButton({ ticketId }: MemberResolveTicketButtonProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function onResolve() {
    setPending(true);
    const result = await memberResolveSupportTicket(ticketId);
    setMessage(result.message);
    setPending(false);
    if (result.ok) window.location.reload();
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={onResolve}
        className="btn-secondary w-fit"
      >
        {pending ? "Encerrando..." : "Marcar como resolvido"}
      </button>
      {message ? <p className="text-sm text-muted">{message}</p> : null}
    </div>
  );
}
