"use client";

import { useMemo, useState } from "react";
import { MemberPhaseCard } from "@/components/editais/member-phase-card";

export type MemberEnrollmentView = {
  id: string;
  editalTitle: string;
  cargoName: string;
  phasesTotal: number;
  averageGrade: number | null;
  phases: Array<{
    id: string;
    phaseNumber: number;
    title: string;
    description: string;
    deadlineAt: string;
    submissionId: string | null;
    submissionStatus: "enviado" | "em_correcao" | "corrigido" | null;
    allowResubmit: boolean;
    correction: {
      grade: number | null;
      feedback: string;
      errorsNotes: string;
      correctorId: string | null;
    } | null;
    corrector: {
      fullName: string;
      avatarUrl: string | null;
      bio: string | null;
    } | null;
  }>;
};

type MemberEditaisViewProps = {
  enrollments: MemberEnrollmentView[];
};

export function MemberEditaisView({ enrollments }: MemberEditaisViewProps) {
  const [enrollmentId, setEnrollmentId] = useState("");

  const visible = useMemo(() => {
    if (!enrollmentId) return enrollments;
    return enrollments.filter((item) => item.id === enrollmentId);
  }, [enrollments, enrollmentId]);

  const showFilter = enrollments.length > 1;

  return (
    <div className="flex flex-col gap-8">
      {showFilter ? (
        <section className="panel-card flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Filtrar edital</h2>
            <p className="mt-1 text-sm text-muted">
              Você está inscrito em {enrollments.length} editais. Escolha qual exibir.
            </p>
          </div>
          <label className="flex w-full flex-col gap-2 text-sm font-medium sm:max-w-md">
            <span className="sr-only">Edital</span>
            <select
              className="field-input"
              value={enrollmentId}
              onChange={(event) => setEnrollmentId(event.target.value)}
            >
              <option value="">Todos os editais</option>
              {enrollments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.editalTitle} · {item.cargoName}
                </option>
              ))}
            </select>
          </label>
        </section>
      ) : null}

      {visible.map((enrollment) => (
        <section key={enrollment.id} className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold">{enrollment.editalTitle}</h2>
            <p className="text-sm text-muted">Cargo: {enrollment.cargoName}</p>
            {enrollment.averageGrade != null ? (
              <p className="mt-2 text-sm font-medium tabular-nums">
                Média: {enrollment.averageGrade.toLocaleString("pt-BR")}
                <span className="font-normal text-muted">
                  {" "}
                  · {enrollment.phasesTotal}{" "}
                  {enrollment.phasesTotal === 1 ? "fase" : "fases"} no edital
                </span>
              </p>
            ) : null}
          </div>
          <div className="grid gap-4">
            {enrollment.phases.map((phase) => (
              <MemberPhaseCard
                key={phase.id}
                enrollmentId={enrollment.id}
                phaseId={phase.id}
                phaseNumber={phase.phaseNumber}
                title={phase.title}
                description={phase.description}
                deadlineAt={phase.deadlineAt}
                submissionId={phase.submissionId}
                submissionStatus={phase.submissionStatus}
                allowResubmit={phase.allowResubmit}
                correction={phase.correction}
                corrector={phase.corrector}
              />
            ))}
            {!enrollment.phases.length ? (
              <p className="text-sm text-muted">Nenhuma fase liberada neste edital ainda.</p>
            ) : null}
          </div>
        </section>
      ))}

      {showFilter && enrollmentId && !visible.length ? (
        <p className="text-sm text-muted">Nenhum edital selecionado.</p>
      ) : null}
    </div>
  );
}
