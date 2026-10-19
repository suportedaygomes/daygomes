"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  reprocessAllUnlinkedKiwifyOrders,
  reprocessKiwifyOrder,
  resendKiwifyAccessEmail,
} from "@/app/actions/kiwify-mappings";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export type KiwifyOrderListItem = {
  orderId: string;
  webhookEventType: string;
  customerEmail: string;
  kiwifyProductId: string | null;
  emailLabel: string;
  userLabel: string;
  linked: boolean;
  accessEmailSent: boolean;
};

type KiwifyOrdersPanelProps = {
  orders: KiwifyOrderListItem[];
  unlinkedCount: number;
};

export function KiwifyOrdersPanel({ orders, unlinkedCount }: KiwifyOrdersPanelProps) {
  const router = useRouter();
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [bulkPending, setBulkPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reprocessAllOpen, setReprocessAllOpen] = useState(false);

  async function runAction(
    orderId: string,
    action: "reprocess" | "resend",
  ) {
    setError("");
    setMessage("");
    setPendingOrderId(orderId);
    const result =
      action === "reprocess"
        ? await reprocessKiwifyOrder(orderId)
        : await resendKiwifyAccessEmail(orderId);
    setPendingOrderId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage(result.message);
    router.refresh();
  }

  async function onConfirmReprocessAll() {
    setReprocessAllOpen(false);
    setError("");
    setMessage("");
    setBulkPending(true);
    const result = await reprocessAllUnlinkedKiwifyOrders();
    setBulkPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage(result.message);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Pedidos sem acesso liberado na lista recente:{" "}
          <strong className="text-foreground">{unlinkedCount}</strong>
        </p>
        {unlinkedCount > 0 ? (
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={bulkPending}
            onClick={() => setReprocessAllOpen(true)}
          >
            {bulkPending ? "Reprocessando..." : "Reprocessar todos sem vínculo"}
          </button>
        ) : null}
      </div>

      {error ? <p className="alert-error text-sm">{error}</p> : null}
      {message ? <p className="alert-success text-sm">{message}</p> : null}

      <ul className="flex flex-col gap-2 text-sm">
        {orders.map((order) => (
          <li
            key={order.orderId}
            className={`rounded-xl border px-3 py-2 ${order.linked ? "border-white/8 text-muted" : "border-amber-400/35 text-amber-100/90"}`}
          >
            <p>
              <span className="font-mono text-xs">{order.orderId}</span>
              {" · "}
              {order.webhookEventType}
              {" · "}
              {order.customerEmail}
            </p>
            <p className="mt-1 text-xs">
              {order.emailLabel}
              {" · "}
              {order.userLabel}
              {order.kiwifyProductId ? (
                <>
                  {" · "}
                  <span className="text-muted">produto {order.kiwifyProductId}</span>
                </>
              ) : null}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {!order.linked ? (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  disabled={pendingOrderId === order.orderId}
                  onClick={() => runAction(order.orderId, "reprocess")}
                >
                  {pendingOrderId === order.orderId ? "..." : "Reprocessar"}
                </button>
              ) : null}
              {order.linked && !order.accessEmailSent ? (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  disabled={pendingOrderId === order.orderId}
                  onClick={() => runAction(order.orderId, "resend")}
                >
                  {pendingOrderId === order.orderId ? "..." : "Reenviar e-mail"}
                </button>
              ) : null}
            </div>
          </li>
        ))}
        {!orders.length ? <li className="text-muted">Nenhum pedido ainda.</li> : null}
      </ul>

      <ConfirmDialog
        open={reprocessAllOpen}
        title="Reprocessar pedidos sem vínculo?"
        description={
          <>
            Serão reprocessados até 30 pedidos da fila recente ({unlinkedCount} sem vínculo). Confirme
            que os <span className="font-mono text-xs">product_id</span> já estão mapeados antes de
            continuar.
          </>
        }
        confirmLabel="Reprocessar"
        pending={bulkPending}
        onConfirm={onConfirmReprocessAll}
        onCancel={() => setReprocessAllOpen(false)}
      />
    </div>
  );
}
