-- Admin pode aumentar cota além de 4 (ex.: alunos antigos que já esgotaram o plano).

alter table public.member_edital_enrollments
  drop constraint if exists member_edital_enrollments_correction_quota_check;

alter table public.member_edital_enrollments
  add constraint member_edital_enrollments_correction_quota_check
  check (correction_quota between 0 and 99);

comment on column public.member_edital_enrollments.correction_quota is
  'Total de correções do plano na inscrição (0–99). Disponíveis = cota − usadas; admin pode ajustar na ficha do membro.';
