-- Alunos inscritos na mentoria podem ler todos os temas do edital (como na UI).
drop policy if exists edital_phases_read_unlocked on public.edital_phases;

create policy edital_phases_read_unlocked on public.edital_phases
  for select
  using (
    public.is_admin()
    or public.is_corretor()
    or exists (
      select 1
      from public.edital_cargos c
      join public.member_edital_enrollments e on e.edital_id = c.edital_id
      where c.id = edital_phases.cargo_id
        and e.member_id = auth.uid()
    )
  );

-- Backfill: lembretes e painel admin usam member_phase_access.
insert into public.member_phase_access (enrollment_id, phase_id, unlocked_at)
select e.id, ph.id, e.created_at
from public.member_edital_enrollments e
join public.edital_cargos c on c.edital_id = e.edital_id
join public.edital_phases ph on ph.cargo_id = c.id
on conflict (enrollment_id, phase_id) do nothing;
