create table if not exists public.submission_markups (
  submission_id uuid primary key references public.phase_submissions (id) on delete cascade,
  corrector_id uuid references public.profiles (id) on delete set null,
  annotations jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists submission_markups_updated_at_idx
  on public.submission_markups (updated_at desc);
