-- Tamanho do banco para o painel de gerenciamento (service role / admin API).

create or replace function public.admin_report_database_size_bytes()
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select pg_database_size(current_database());
$$;

revoke all on function public.admin_report_database_size_bytes() from public;
grant execute on function public.admin_report_database_size_bytes() to service_role;
