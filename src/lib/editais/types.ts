export type PhaseInput = {
  title: string;
  description: string;
  deadlineAt: string;
};

export type CargoInput = {
  name: string;
  vacancyCount: number;
  phases: PhaseInput[];
};

export type CreateEditalInput = {
  title: string;
  cargos: CargoInput[];
};
