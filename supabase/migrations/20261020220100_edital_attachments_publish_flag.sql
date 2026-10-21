alter table public.edital_attachments
  add column if not exists is_published boolean not null default true;

comment on column public.edital_attachments.is_published is
  'false = rascunho (só admin); true = visível para membros e corretores.';
