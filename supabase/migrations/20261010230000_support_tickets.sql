alter table public.profiles
  add column if not exists whatsapp text;

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.profiles (id) on delete set null,
  requester_name text,
  requester_email text not null,
  requester_whatsapp text not null,
  title text not null,
  description text not null,
  attachment_path text,
  attachment_mime text,
  status text not null default 'aberto' check (status in ('aberto', 'em_atendimento', 'resolvido')),
  staff_notes text,
  handled_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_tickets_status_created_idx on public.support_tickets (status, created_at desc);
create index support_tickets_member_id_idx on public.support_tickets (member_id);

alter table public.support_tickets enable row level security;
