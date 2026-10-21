create table if not exists public.edital_admin_drafts (
  edital_id uuid primary key references public.editais (id) on delete cascade,
  published_revision timestamptz not null,
  structure jsonb,
  evaluation_rubric jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create index if not exists edital_admin_drafts_updated_at_idx
  on public.edital_admin_drafts (updated_at desc);

alter table public.edital_admin_drafts enable row level security;

drop policy if exists edital_admin_drafts_admin on public.edital_admin_drafts;
create policy edital_admin_drafts_admin on public.edital_admin_drafts
  for all
  using (public.is_admin())
  with check (public.is_admin());

comment on table public.edital_admin_drafts is
  'Rascunho de edição admin (estrutura e quesitos) até publicar; sincroniza entre dispositivos.';
