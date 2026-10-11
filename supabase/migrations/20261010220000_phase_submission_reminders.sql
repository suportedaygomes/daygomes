create table public.phase_submission_reminders (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.member_edital_enrollments (id) on delete cascade,
  phase_id uuid not null references public.edital_phases (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  reminder_kind text not null check (reminder_kind in ('7_days', '1_day')),
  sent_at timestamptz not null default now(),
  unique (enrollment_id, phase_id, reminder_kind)
);

create index phase_submission_reminders_member_id_idx on public.phase_submission_reminders (member_id);

alter table public.phase_submission_reminders enable row level security;
