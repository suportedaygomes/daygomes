-- Cargos: modalidades dissertativa / estudo de caso
alter table public.edital_cargos
  add column if not exists offers_dissertativa boolean not null default true,
  add column if not exists offers_estudo_caso boolean not null default false;

alter table public.edital_phases
  add column if not exists activity_kind text not null default 'dissertativa';

alter table public.edital_phases
  drop constraint if exists edital_phases_activity_kind_check;

alter table public.edital_phases
  add constraint edital_phases_activity_kind_check
  check (activity_kind in ('dissertativa', 'estudo_caso'));

create unique index if not exists edital_phases_cargo_kind_phase_idx
  on public.edital_phases (cargo_id, activity_kind, phase_number);

-- Inscrição na mentoria (edital inteiro + cota de envios)
alter table public.member_edital_enrollments
  add column if not exists correction_quota integer not null default 4;

alter table public.member_edital_enrollments
  drop constraint if exists member_edital_enrollments_correction_quota_check;

alter table public.member_edital_enrollments
  add constraint member_edital_enrollments_correction_quota_check
  check (correction_quota between 1 and 4);

alter table public.member_edital_enrollments
  alter column cargo_id drop not null;

alter table public.member_edital_enrollments
  drop constraint if exists member_edital_enrollments_member_id_edital_id_cargo_id_key;

-- Modelo antigo: uma linha por cargo no mesmo edital → manter a inscrição mais antiga
create temp table _enrollment_dedupe on commit drop as
select e.id as old_id, k.keep_id
from public.member_edital_enrollments e
join (
  select distinct on (member_id, edital_id)
    id as keep_id,
    member_id,
    edital_id
  from public.member_edital_enrollments
  order by member_id, edital_id, created_at asc, id asc
) k on k.member_id = e.member_id and k.edital_id = e.edital_id
where e.id <> k.keep_id;

update public.phase_submissions ps
set enrollment_id = d.keep_id
from _enrollment_dedupe d
where ps.enrollment_id = d.old_id
  and not exists (
    select 1
    from public.phase_submissions ps2
    where ps2.enrollment_id = d.keep_id
      and ps2.phase_id = ps.phase_id
  );

delete from public.phase_submissions ps
using _enrollment_dedupe d
where ps.enrollment_id = d.old_id;

update public.kiwify_order_events k
set enrollment_id = d.keep_id
from _enrollment_dedupe d
where k.enrollment_id = d.old_id;

delete from public.phase_submission_reminders r
using _enrollment_dedupe d
where r.enrollment_id = d.old_id;

delete from public.member_edital_enrollments e
using _enrollment_dedupe d
where e.id = d.old_id;

create unique index if not exists member_edital_enrollments_member_edital_uidx
  on public.member_edital_enrollments (member_id, edital_id);

-- Kiwify: edital + quantidade de correções (sem cargo fixo)
alter table public.kiwify_product_mappings
  add column if not exists correction_quota integer not null default 1;

alter table public.kiwify_product_mappings
  drop constraint if exists kiwify_product_mappings_correction_quota_check;

alter table public.kiwify_product_mappings
  add constraint kiwify_product_mappings_correction_quota_check
  check (correction_quota between 1 and 4);

alter table public.kiwify_product_mappings
  alter column cargo_id drop not null;

comment on column public.member_edital_enrollments.correction_quota is
  'Número máximo de envios (correções) incluídos na mentoria (1 a 4).';

comment on column public.edital_phases.activity_kind is
  'dissertativa = redação dissertativa; estudo_caso = estudo de caso.';
