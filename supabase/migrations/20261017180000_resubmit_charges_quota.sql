alter table public.phase_corrections
  add column if not exists resubmit_charges_quota boolean not null default false;

comment on column public.phase_corrections.resubmit_charges_quota is
  'Quando true junto com allow_resubmit, o próximo reenvio nesta fase consome 1 correção da cota.';

create table if not exists public.enrollment_correction_quota_charges (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.member_edital_enrollments (id) on delete cascade,
  phase_id uuid not null references public.edital_phases (id) on delete cascade,
  submission_id uuid not null references public.phase_submissions (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists enrollment_correction_quota_charges_enrollment_idx
  on public.enrollment_correction_quota_charges (enrollment_id);
