-- Mentoria só conteúdo (ex.: Redação do Zero) pode ter 0 correções; pacotes 1–4 são à parte.

alter table public.member_edital_enrollments
  drop constraint if exists member_edital_enrollments_correction_quota_check;

alter table public.member_edital_enrollments
  add constraint member_edital_enrollments_correction_quota_check
  check (correction_quota between 0 and 4);

alter table public.kiwify_product_mappings
  drop constraint if exists kiwify_product_mappings_correction_quota_check;

alter table public.kiwify_product_mappings
  add constraint kiwify_product_mappings_correction_quota_check
  check (correction_quota between 0 and 4);

comment on column public.kiwify_product_mappings.correction_quota is
  '0 = só acesso à mentoria (sem correções); 1–4 = pacote de correções ou mentoria já com correções incluídas.';
