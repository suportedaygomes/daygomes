create table if not exists public.kiwify_product_mappings (
  id uuid primary key default gen_random_uuid(),
  kiwify_product_id text not null unique,
  kiwify_product_name text,
  edital_id uuid not null references public.editais (id) on delete cascade,
  cargo_id uuid not null references public.edital_cargos (id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kiwify_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,
  webhook_event_type text not null,
  order_status text,
  customer_email text not null,
  kiwify_product_id text,
  profile_id uuid references public.profiles (id) on delete set null,
  enrollment_id uuid references public.member_edital_enrollments (id) on delete set null,
  access_email_sent boolean not null default false,
  created_user boolean not null default false,
  processed_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create index if not exists kiwify_order_events_email_idx on public.kiwify_order_events (customer_email);

create table if not exists public.kiwify_access_emails (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  recipient_email text not null,
  subject text not null,
  status text not null check (status in ('sent', 'failed')),
  error_message text,
  order_id text,
  created_at timestamptz not null default now()
);

alter table public.kiwify_product_mappings enable row level security;
alter table public.kiwify_order_events enable row level security;
alter table public.kiwify_access_emails enable row level security;

drop policy if exists kiwify_mappings_admin on public.kiwify_product_mappings;
drop policy if exists kiwify_orders_admin_read on public.kiwify_order_events;
drop policy if exists kiwify_emails_admin_read on public.kiwify_access_emails;

create policy kiwify_mappings_admin
  on public.kiwify_product_mappings
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy kiwify_orders_admin_read
  on public.kiwify_order_events
  for select
  to authenticated
  using (public.is_admin());

create policy kiwify_emails_admin_read
  on public.kiwify_access_emails
  for select
  to authenticated
  using (public.is_admin());
