import type { ActivityKind } from "@/lib/editais/activity-kind";
import type { EditalEvaluationRubric } from "@/lib/editais/evaluation-rubric";

export type PhaseInput = {
  title: string;
  description: string;
};

export type PhaseEditInput = PhaseInput & {
  id?: string;
  activityKind: ActivityKind;
};

export type CargoInput = {
  name: string;
  offersDissertativa: boolean;
  offersEstudoCaso: boolean;
  phasesDissertativa: PhaseInput[];
  phasesEstudoCaso: PhaseInput[];
};

export type CargoEditInput = {
  id?: string;
  name: string;
  offersDissertativa: boolean;
  offersEstudoCaso: boolean;
  phases: PhaseEditInput[];
};

export type UpdateEditalInput = {
  editalId: string;
  title: string;
  submissionPeriodDays: number;
  defaultCorrectionQuota: number;
  cargos: CargoEditInput[];
};

export type CreateEditalInput = {
  title: string;
  submissionPeriodDays: number;
  defaultCorrectionQuota: number;
  cargos: CargoInput[];
  evaluationRubric?: EditalEvaluationRubric | null;
};
