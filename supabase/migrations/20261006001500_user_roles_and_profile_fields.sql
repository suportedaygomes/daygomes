-- Referência local da migration aplicada no projeto remoto (day_profiles + roles).

create type public.user_role as enum ('membro', 'corretor', 'admin');

alter table public.profiles
  add column if not exists role public.user_role not null default 'membro',
  add column if not exists cpf text,
  add column if not exists birth_date date,
  add column if not exists avatar_path text;
