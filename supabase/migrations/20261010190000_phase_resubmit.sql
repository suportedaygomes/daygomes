alter table public.phase_corrections
  add column if not exists allow_resubmit boolean not null default false;
