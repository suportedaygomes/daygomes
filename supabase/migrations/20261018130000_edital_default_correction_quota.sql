alter table public.editais
  add column if not exists default_correction_quota integer not null default 4;

alter table public.editais
  drop constraint if exists editais_default_correction_quota_check;

alter table public.editais
  add constraint editais_default_correction_quota_check
  check (default_correction_quota between 0 and 4);

comment on column public.editais.default_correction_quota is
  'Cota padrão ao vincular o produto principal da mentoria na Kiwify (0 = só conteúdo; 4 = mentorias com correções inclusas).';
