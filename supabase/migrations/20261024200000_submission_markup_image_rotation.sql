alter table public.submission_markups
  add column if not exists image_rotation smallint not null default 0;

alter table public.submission_markups
  drop constraint if exists submission_markups_image_rotation_check;

alter table public.submission_markups
  add constraint submission_markups_image_rotation_check
  check (image_rotation in (0, 90, 180, 270));