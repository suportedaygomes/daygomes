alter table public.phase_submissions
  add column if not exists preview_storage_path text;
