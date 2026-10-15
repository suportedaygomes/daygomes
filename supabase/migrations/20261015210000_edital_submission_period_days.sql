alter table public.editais
  add column if not exists submission_period_days integer not null default 30;

alter table public.edital_phases
  alter column deadline_at drop not null;

comment on column public.editais.submission_period_days is
  'Dias para o membro enviar todas as fases do cargo; dividido igualmente por fase a partir da liberação.';
