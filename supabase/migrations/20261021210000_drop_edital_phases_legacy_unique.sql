-- Permite dissertativa e estudo de caso com phase_number 1..n no mesmo cargo.
-- A unicidade correta é (cargo_id, activity_kind, phase_number) — ver edital_phases_cargo_kind_phase_idx.
alter table public.edital_phases
  drop constraint if exists edital_phases_cargo_id_phase_number_key;
