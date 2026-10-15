import type { EditalEvaluationRubric } from "@/lib/editais/evaluation-rubric";

export type PhaseInput = {
  title: string;
  description: string;
};

export type PhaseEditInput = PhaseInput & {
  id?: string;
};

export type CargoInput = {
  name: string;
  vacancyCount: number;
  phases: PhaseInput[];
};

export type CargoEditInput = {
  id?: string;
  name: string;
  vacancyCount: number;
  phases: PhaseEditInput[];
};

export type UpdateEditalInput = {
  editalId: string;
  title: string;
  submissionPeriodDays: number;
  cargos: CargoEditInput[];
};

export type CreateEditalInput = {
  title: string;
  submissionPeriodDays: number;
  cargos: CargoInput[];
  evaluationRubric?: EditalEvaluationRubric | null;
};
