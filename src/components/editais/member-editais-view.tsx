"use client";

import { useMemo, useState } from "react";
import { EditalAttachmentsPanel } from "@/components/editais/edital-attachments-panel";
import { MemberPhaseCard } from "@/components/editais/member-phase-card";
import { PhaseDescriptionContent } from "@/components/editais/phase-description-content";
import { MemberPhaseStatusBadge } from "@/components/editais/member-phase-status-badge";
import type { ActivityKind } from "@/lib/editais/activity-kind";
import type { EditalAttachmentView } from "@/lib/editais/attachments-shared";
import {
  classifyMemberPhase,
  type MemberPhaseBucket,
} from "@/lib/editais/member-phase-status";

export type MemberPhaseView = {
  id: string;
  phaseNumber: number;
  title: string;
  description: string;
  deadlineAt: string;
  submissionId: string | null;
  submissionStatus: "enviado" | "em_correcao" | "corrigido" | null;
  allowResubmit: boolean;
  quotaBlocksNewUpload: boolean;
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
};

export type MemberCargoTrackView = {
  trackKey: string;
  cargoId: string;
  cargoName: string;
  activityKind: ActivityKind;
  displayName: string;
  phases: MemberPhaseView[];
};

export type MemberEnrollmentView = {
  id: string;
  editalId: string;
  editalTitle: string;
  correctionQuota: number;
  correctionsUsed: number;
  correctionsRemaining: number;
  attachments: EditalAttachmentView[];
  phasesTotal: number;
  averageGrade: number | null;
  tracks: MemberCargoTrackView[];
};

type MemberEditaisViewProps = {
  enrollments: MemberEnrollmentView[];
};

type FlatPhase = MemberPhaseView & {
  trackKey: string;
  trackLabel: string;
};

type ActivityTab = "corrigidas" | "andamento" | "enviar" | "todas";
type CorrectedSort = "phase" | "grade_desc" | "grade_asc";

function sortCorrectedPhases(phases: FlatPhase[], sort: CorrectedSort): FlatPhase[] {
  const list = [...phases];
  if (sort === "grade_desc") {
    return list.sort((a, b) => {
      const ga = a.correction?.grade;
      const gb = b.correction?.grade;
      if (ga == null && gb == null) {
        return a.trackLabel.localeCompare(b.trackLabel) || a.phaseNumber - b.phaseNumber;
      }
      if (ga == null) return 1;
      if (gb == null) return -1;
      return gb - ga || a.phaseNumber - b.phaseNumber;
    });
  }
  if (sort === "grade_asc") {
    return list.sort((a, b) => {
      const ga = a.correction?.grade;
      const gb = b.correction?.grade;
      if (ga == null && gb == null) {
        return a.trackLabel.localeCompare(b.trackLabel) || a.phaseNumber - b.phaseNumber;
      }
      if (ga == null) return 1;
      if (gb == null) return -1;
      return ga - gb || a.phaseNumber - b.phaseNumber;
    });
  }
  return list.sort(
    (a, b) => a.trackLabel.localeCompare(b.trackLabel) || a.phaseNumber - b.phaseNumber,
  );
}

function flattenPhases(enrollment: MemberEnrollmentView): FlatPhase[] {
  return enrollment.tracks.flatMap((track) =>
    track.phases.map((phase) => ({
      ...phase,
      trackKey: track.trackKey,
      trackLabel: track.displayName,
    })),
  );
}

function countByBucket(phases: FlatPhase[], buckets: MemberPhaseBucket[]) {
  return phases.filter((p) => buckets.includes(classifyMemberPhase(p))).length;
}

function EnrollmentWorkspace({ enrollment }: { enrollment: MemberEnrollmentView }) {
  const [trackKey, setTrackKey] = useState(enrollment.tracks[0]?.trackKey ?? "");
  const [activityTab, setActivityTab] = useState<ActivityTab>("corrigidas");
  const [phasePicker, setPhasePicker] = useState("");
  const [correctedTrackFilter, setCorrectedTrackFilter] = useState("");
  const [correctedSort, setCorrectedSort] = useState<CorrectedSort>("phase");

  const allPhases = useMemo(() => flattenPhases(enrollment), [enrollment]);

  const corrected = useMemo(
    () => allPhases.filter((p) => classifyMemberPhase(p) === "corrected"),
    [allPhases],
  );

  const displayedCorrected = useMemo(() => {
    let list = corrected;
    if (correctedTrackFilter) {
      list = list.filter((p) => p.trackKey === correctedTrackFilter);
    }
    return sortCorrectedPhases(list, correctedSort);
  }, [corrected, correctedTrackFilter, correctedSort]);

  const inProgress = useMemo(
    () =>
      allPhases.filter((p) => {
        const b = classifyMemberPhase(p);
        return b === "awaiting" || b === "resubmit";
      }),
    [allPhases],
  );

  const activeTrackKey =
    trackKey && enrollment.tracks.some((t) => t.trackKey === trackKey)
      ? trackKey
      : enrollment.tracks[0]?.trackKey ?? "";
  const activeTrack = enrollment.tracks.find((t) => t.trackKey === activeTrackKey);

  const trackPhases = useMemo(() => {
    if (!activeTrack) return [];
    return activeTrack.phases.map((phase) => ({
      ...phase,
      trackKey: activeTrack.trackKey,
      trackLabel: activeTrack.displayName,
    }));
  }, [activeTrack]);

  const filteredTrackPhases = useMemo(() => {
    if (activityTab === "todas") return trackPhases;
    if (activityTab === "corrigidas") {
      return trackPhases.filter((p) => classifyMemberPhase(p) === "corrected");
    }
    if (activityTab === "andamento") {
      return trackPhases.filter((p) => {
        const b = classifyMemberPhase(p);
        return b === "awaiting" || b === "resubmit";
      });
    }
    return trackPhases.filter((p) => {
      const b = classifyMemberPhase(p);
      return b === "available" || b === "resubmit";
    });
  }, [trackPhases, activityTab]);

  const manyPhases = (activeTrack?.phases.length ?? 0) > 12;
  const pickerPhase = phasePicker
    ? trackPhases.find((p) => p.id === phasePicker)
    : null;

  const tabCounts = {
    corrigidas: countByBucket(allPhases, ["corrected"]),
    andamento: countByBucket(allPhases, ["awaiting", "resubmit"]),
    enviar: countByBucket(allPhases, ["available", "resubmit"]),
  };

  return (
    <section className="flex flex-col gap-6">
      <header className="panel-card flex flex-col gap-3">
        <h2 className="text-2xl font-semibold">{enrollment.editalTitle}</h2>
        <p className="text-sm text-muted">
          Você pode enviar até{" "}
          <strong className="text-foreground">{enrollment.correctionQuota}</strong> correções nesta
          mentoria (em qualquer cargo ou fase). Cada fase nova enviada usa{" "}
          <strong className="text-foreground">1</strong> da sua cota; reenvio liberado pelo
          corretor <strong className="text-foreground">não</strong> consome outra.
        </p>
        <p className="text-sm text-muted">
          Utilizadas:{" "}
          <strong className="text-foreground">
            {enrollment.correctionsUsed} de {enrollment.correctionQuota}
          </strong>{" "}
          · Disponíveis:{" "}
          <strong className="text-foreground">{enrollment.correctionsRemaining}</strong>
        </p>
        {enrollment.averageGrade != null ? (
          <p className="text-sm text-muted">
            Média nas fases corrigidas:{" "}
            <strong className="text-foreground">
              {enrollment.averageGrade.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
            </strong>
          </p>
        ) : null}
        {enrollment.attachments.length ? (
          <EditalAttachmentsPanel
            editalId={enrollment.editalId}
            attachments={enrollment.attachments}
          />
        ) : null}
      </header>

      {corrected.length > 0 ? (
        <section className="panel-card flex flex-col gap-4">
          <div>
            <h3 className="panel-title">Correções recebidas</h3>
            <p className="mt-1 text-sm text-muted">
              Fases já corrigidas nesta mentoria ({enrollment.editalTitle}). Clique para ver nota e
              feedback.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            {enrollment.tracks.length > 1 ? (
              <label className="flex min-w-[12rem] flex-1 flex-col gap-2 text-sm font-medium">
                Cargo / modalidade
                <select
                  className="field-input"
                  value={correctedTrackFilter}
                  onChange={(event) => setCorrectedTrackFilter(event.target.value)}
                >
                  <option value="">Todos neste edital</option>
                  {enrollment.tracks.map((track) => (
                    <option key={track.trackKey} value={track.trackKey}>
                      {track.displayName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="flex min-w-[12rem] flex-col gap-2 text-sm font-medium">
              Ordenar por
              <select
                className="field-input"
                value={correctedSort}
                onChange={(event) => setCorrectedSort(event.target.value as CorrectedSort)}
              >
                <option value="phase">Cargo e número da fase</option>
                <option value="grade_desc">Maior nota primeiro</option>
                <option value="grade_asc">Menor nota primeiro</option>
              </select>
            </label>
          </div>
          <ul className="flex flex-col gap-2">
            {displayedCorrected.map((phase) => (
              <li key={phase.id}>
                <MemberPhaseCard
                  enrollmentId={enrollment.id}
                  phaseId={phase.id}
                  phaseNumber={phase.phaseNumber}
                  title={phase.title}
                  description={phase.description}
                  deadlineAt={phase.deadlineAt}
                  submissionStatus={phase.submissionStatus}
                  submissionId={phase.submissionId}
                  allowResubmit={phase.allowResubmit}
                  quotaBlocksNewUpload={phase.quotaBlocksNewUpload}
                  correction={phase.correction}
                  corrector={phase.corrector}
                  trackLabel={phase.trackLabel}
                  defaultCollapsed
                />
              </li>
            ))}
          </ul>
          {!displayedCorrected.length ? (
            <p className="text-sm text-muted">Nenhuma correção neste filtro.</p>
          ) : null}
        </section>
      ) : null}

      {inProgress.length > 0 ? (
        <section className="panel-card flex flex-col gap-4">
          <h3 className="panel-title">Em andamento</h3>
          <ul className="flex flex-col gap-3">
            {inProgress.map((phase) => (
              <li
                key={phase.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    Fase {phase.phaseNumber} · {phase.title}
                  </p>
                  <p className="text-xs text-muted">{phase.trackLabel}</p>
                </div>
                <MemberPhaseStatusBadge phase={phase} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {enrollment.tracks.length ? (
        <section className="flex flex-col gap-4">
          <div className="panel-card flex flex-col gap-4">
            <h3 className="panel-title">Enviar ou revisar uma fase</h3>
            {enrollment.tracks.length > 1 ? (
              <label className="flex flex-col gap-2 text-sm font-medium">
                Cargo e modalidade
                <select
                  className="field-input"
                  value={activeTrackKey}
                  onChange={(event) => {
                    setTrackKey(event.target.value);
                    setPhasePicker("");
                  }}
                >
                  {enrollment.tracks.map((track) => (
                    <option key={track.trackKey} value={track.trackKey}>
                      {track.displayName}
                    </option>
                  ))}
                </select>
              </label>
            ) : activeTrack ? (
              <p className="text-sm text-muted">{activeTrack.displayName}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["corrigidas", `Corrigidas (${tabCounts.corrigidas})`],
                  ["andamento", `Aguardando (${tabCounts.andamento})`],
                  ["enviar", `Enviar (${tabCounts.enviar})`],
                  ["todas", "Todas as fases"],
                ] as const
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  className={
                    activityTab === tab
                      ? "btn-primary btn-sm"
                      : "btn-secondary btn-sm"
                  }
                  onClick={() => {
                    setActivityTab(tab);
                    setPhasePicker("");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {manyPhases && activityTab === "enviar" ? (
              <label className="flex flex-col gap-2 text-sm font-medium">
                Escolher fase para enviar
                <select
                  className="field-input"
                  value={phasePicker}
                  onChange={(event) => setPhasePicker(event.target.value)}
                >
                  <option value="">Selecione uma fase…</option>
                  {trackPhases
                    .filter((p) => {
                      const b = classifyMemberPhase(p);
                      return b === "available" || b === "resubmit";
                    })
                    .map((phase) => (
                      <option key={phase.id} value={phase.id}>
                        Fase {phase.phaseNumber} — {phase.title}
                      </option>
                    ))}
                </select>
              </label>
            ) : null}
          </div>

          {activeTrack ? (
            <div className="flex flex-col gap-4">
              {manyPhases && activityTab === "enviar" && pickerPhase ? (
                <MemberPhaseCard
                  enrollmentId={enrollment.id}
                  phaseId={pickerPhase.id}
                  phaseNumber={pickerPhase.phaseNumber}
                  title={pickerPhase.title}
                  description={pickerPhase.description}
                  deadlineAt={pickerPhase.deadlineAt}
                  submissionStatus={pickerPhase.submissionStatus}
                  submissionId={pickerPhase.submissionId}
                  allowResubmit={pickerPhase.allowResubmit}
                  quotaBlocksNewUpload={pickerPhase.quotaBlocksNewUpload}
                  correction={pickerPhase.correction}
                  corrector={pickerPhase.corrector}
                  trackLabel={pickerPhase.trackLabel}
                />
              ) : (
                filteredTrackPhases.map((phase) => (
                  <MemberPhaseCard
                    key={phase.id}
                    enrollmentId={enrollment.id}
                    phaseId={phase.id}
                    phaseNumber={phase.phaseNumber}
                    title={phase.title}
                    description={phase.description}
                    deadlineAt={phase.deadlineAt}
                    submissionStatus={phase.submissionStatus}
                    submissionId={phase.submissionId}
                    allowResubmit={phase.allowResubmit}
                    quotaBlocksNewUpload={phase.quotaBlocksNewUpload}
                    correction={phase.correction}
                    corrector={phase.corrector}
                    trackLabel={phase.trackLabel}
                    defaultCollapsed={
                      classifyMemberPhase(phase) === "corrected" && manyPhases
                    }
                  />
                ))
              )}
              {!filteredTrackPhases.length && !(manyPhases && pickerPhase) ? (
                <p className="text-sm text-muted">
                  Nenhuma fase neste filtro para o cargo selecionado.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : (
        <p className="text-sm text-muted">Nenhum cargo cadastrado neste edital.</p>
      )}

      <details className="panel-card">
        <summary className="cursor-pointer text-sm font-semibold">
          Orientações de todas as fases
        </summary>
        <div className="mt-4 flex flex-col gap-6">
          {enrollment.tracks.map((track) => (
            <div key={track.trackKey}>
              <h4 className="font-medium text-purple">{track.displayName}</h4>
              <ul className="mt-2 flex flex-col gap-3 text-sm text-muted">
                {track.phases.map((phase) => (
                  <li key={phase.id}>
                    <p className="font-medium text-foreground">
                      Fase {phase.phaseNumber}: {phase.title}
                    </p>
                          <PhaseDescriptionContent html={phase.description} className="mt-1" />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}

export function MemberEditaisView({ enrollments }: MemberEditaisViewProps) {
  const [enrollmentId, setEnrollmentId] = useState("");

  const visible = useMemo(() => {
    if (!enrollmentId) return enrollments;
    return enrollments.filter((item) => item.id === enrollmentId);
  }, [enrollments, enrollmentId]);

  const showEditalFilter = enrollments.length > 1;

  return (
    <div className="flex flex-col gap-8">
      {showEditalFilter ? (
        <section className="panel-card flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Filtrar mentoria</h2>
            <p className="mt-1 text-sm text-muted">
              Você está inscrito em {enrollments.length} mentorias.
            </p>
          </div>
          <label className="flex w-full flex-col gap-2 text-sm font-medium sm:max-w-md">
            <span className="sr-only">Edital</span>
            <select
              className="field-input"
              value={enrollmentId}
              onChange={(event) => setEnrollmentId(event.target.value)}
            >
              <option value="">Todas as mentorias</option>
              {enrollments.map((item) => (
                <option key={item.id} value={item.id}>{item.editalTitle}</option>
              ))}
            </select>
          </label>
        </section>
      ) : null}

      {visible.map((enrollment) => (
        <EnrollmentWorkspace key={enrollment.id} enrollment={enrollment} />
      ))}
    </div>
  );
}
