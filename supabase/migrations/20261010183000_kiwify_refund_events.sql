-- Permite registrar compra aprovada e reembolso no mesmo order_id.

alter table public.kiwify_order_events
  drop constraint if exists kiwify_order_events_order_id_key;

create unique index if not exists kiwify_order_events_approval_dedup
  on public.kiwify_order_events (order_id)
  where webhook_event_type in ('order_approved', 'compra_aprovada');

create unique index if not exists kiwify_order_events_refund_dedup
  on public.kiwify_order_events (order_id)
  where webhook_event_type in ('order_refunded', 'compra_reembolsada', 'chargeback');
