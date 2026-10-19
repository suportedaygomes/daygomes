-- Controle de envios em massa de e-mail de acesso (limite diário no app).

create table if not exists public.admin_email_daily_counters (
  day date not null primary key,
  bulk_access_sent integer not null default 0 check (bulk_access_sent >= 0)
);

comment on table public.admin_email_daily_counters is
  'Contador de e-mails de acesso enviados em massa pelo admin (por dia, fuso America/Sao_Paulo no app).';

alter table public.admin_email_daily_counters enable row level security;
