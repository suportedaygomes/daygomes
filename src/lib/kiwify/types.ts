export type KiwifyOrderWebhook = {
  order_id?: string;
  order_ref?: string;
  order_status?: string;
  webhook_event_type?: string;
  Product?: {
    product_id?: string;
    product_name?: string;
  };
  Customer?: {
    full_name?: string;
    first_name?: string;
    email?: string;
    CPF?: string;
    mobile?: string;
  };
};

export function isKiwifyOrderApproved(payload: KiwifyOrderWebhook) {
  const event = (payload.webhook_event_type ?? "").toLowerCase();
  const status = (payload.order_status ?? "").toLowerCase();

  if (event === "order_approved" || event === "compra_aprovada") {
    return true;
  }

  return status === "paid" || status === "approved";
}
