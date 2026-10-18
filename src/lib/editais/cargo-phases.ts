import type { ActivityKind } from "@/lib/editais/activity-kind";
import type { CargoEditInput, CargoInput, PhaseInput } from "@/lib/editais/types";
import { phaseDescriptionPlainText } from "@/lib/rich-text/phase-description";

export function validateCreateCargo(cargo: CargoInput): { ok: true } | { ok: false; message: string } {
  const cargoName = cargo.name.trim().toUpperCase();
  if (!cargoName) {
    return { ok: false, message: "Nome do cargo inválido." };
  }

  if (!cargo.offersDissertativa && !cargo.offersEstudoCaso) {
    return {
      ok: false,
      message: `Selecione ao menos uma modalidade no cargo ${cargoName}.`,
    };
  }

  if (cargo.offersDissertativa && !cargo.phasesDissertativa.length) {
    return {
      ok: false,
      message: `Adicione temas de redação dissertativa no cargo ${cargoName}.`,
    };
  }

  if (cargo.offersEstudoCaso && !cargo.phasesEstudoCaso.length) {
    return {
      ok: false,
      message: `Adicione temas de estudo de caso no cargo ${cargoName}.`,
    };
  }

  for (const phase of [...cargo.phasesDissertativa, ...cargo.phasesEstudoCaso]) {
    if (!phase.title.trim()) {
      return { ok: false, message: "Título do tema é obrigatório." };
    }
    if (!phaseDescriptionPlainText(phase.description).length) {
      return { ok: false, message: "Descrição do tema é obrigatória." };
    }
  }

  return { ok: true };
}

export function validateEditCargo(cargo: CargoEditInput): { ok: true } | { ok: false; message: string } {
  const cargoName = cargo.name.trim().toUpperCase();
  if (!cargoName) {
    return { ok: false, message: "Nome do cargo inválido." };
  }

  if (!cargo.offersDissertativa && !cargo.offersEstudoCaso) {
    return {
      ok: false,
      message: `Selecione ao menos uma modalidade no cargo ${cargoName}.`,
    };
  }

  const dissertativa = cargo.phases.filter((p) => p.activityKind === "dissertativa");
  const estudo = cargo.phases.filter((p) => p.activityKind === "estudo_caso");

  if (cargo.offersDissertativa && !dissertativa.length) {
    return {
      ok: false,
      message: `Adicione temas de redação dissertativa no cargo ${cargoName}.`,
    };
  }

  if (cargo.offersEstudoCaso && !estudo.length) {
    return {
      ok: false,
      message: `Adicione temas de estudo de caso no cargo ${cargoName}.`,
    };
  }

  for (const phase of cargo.phases) {
    if (!phase.title.trim()) {
      return { ok: false, message: "Título do tema é obrigatório." };
    }
    if (!phaseDescriptionPlainText(phase.description).length) {
      return { ok: false, message: "Descrição do tema é obrigatória." };
    }
  }

  return { ok: true };
}

export function phasesForCreateCargo(cargo: CargoInput): Array<{
  activityKind: ActivityKind;
  phases: PhaseInput[];
}> {
  const rows: Array<{ activityKind: ActivityKind; phases: PhaseInput[] }> = [];
  if (cargo.offersDissertativa) {
    rows.push({ activityKind: "dissertativa", phases: cargo.phasesDissertativa });
  }
  if (cargo.offersEstudoCaso) {
    rows.push({ activityKind: "estudo_caso", phases: cargo.phasesEstudoCaso });
  }
  return rows;
}
