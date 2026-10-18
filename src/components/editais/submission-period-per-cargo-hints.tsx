import {
  daysPerPhaseInCargo,
  formatDaysPerPhase,
  normalizeSubmissionPeriodDays,
} from "@/lib/editais/member-phase-deadline";

type CargoPhaseCount = {
  name: string;
  phaseCount: number;
};

type Props = {
  submissionPeriodDays: number;
  cargos: CargoPhaseCount[];
};

export function SubmissionPeriodPerCargoHints({ submissionPeriodDays, cargos }: Props) {
  const totalDays = normalizeSubmissionPeriodDays(submissionPeriodDays);
  const rows = cargos
    .map((cargo, index) => ({
      label: cargo.name.trim() || `Cargo ${index + 1}`,
      phaseCount: Math.max(0, cargo.phaseCount),
    }))
    .filter((cargo) => cargo.phaseCount > 0);

  if (!rows.length) {
    return (
      <p className="text-xs font-normal text-muted">
        Adicione temas aos cargos para ver quantos dias o aluno terá em cada tema.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5 text-xs font-normal text-muted">
      {rows.map((cargo) => {
        const perPhase = daysPerPhaseInCargo(totalDays, cargo.phaseCount);
        return (
          <li key={`${cargo.label}-${cargo.phaseCount}`}>
            <span className="font-medium text-foreground">{cargo.label}</span>
            {" · "}
            {cargo.phaseCount} tema{cargo.phaseCount === 1 ? "" : "s"}: ≈{" "}
            <span className="text-purple">{formatDaysPerPhase(perPhase)}</span> dia(s) por tema
            (após liberar)
          </li>
        );
      })}
    </ul>
  );
}
