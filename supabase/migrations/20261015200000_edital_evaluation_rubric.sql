alter table public.editais
  add column if not exists evaluation_rubric jsonb;

alter table public.phase_corrections
  add column if not exists rubric_scores jsonb;

comment on column public.editais.evaluation_rubric is
  'Quesitos avaliativos, critérios e fórmula da nota final (0–1000).';

comment on column public.phase_corrections.rubric_scores is
  'Notas por código de quesito preenchidas pelo corretor.';
