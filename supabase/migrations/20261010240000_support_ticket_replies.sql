create table if not exists public.support_ticket_replies (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null,
  attachment_path text,
  attachment_mime text,
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_replies_ticket_id_idx
  on public.support_ticket_replies (ticket_id, created_at);

alter table public.support_ticket_replies enable row level security;
