alter table public.phase_submissions
  add column if not exists assigned_corrector_id uuid references public.profiles (id) on delete set null;

create index if not exists phase_submissions_assigned_corrector_idx
  on public.phase_submissions (assigned_corrector_id)
  where assigned_corrector_id is not null;
