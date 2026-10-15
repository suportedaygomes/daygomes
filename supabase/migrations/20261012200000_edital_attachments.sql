create table public.edital_attachments (
  id uuid primary key default gen_random_uuid(),
  edital_id uuid not null references public.editais (id) on delete cascade,
  title text not null,
  description text not null default '',
  storage_path text not null,
  original_filename text not null,
  mime_type text,
  file_size bigint not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index edital_attachments_edital_id_idx on public.edital_attachments (edital_id);

alter table public.edital_attachments enable row level security;
