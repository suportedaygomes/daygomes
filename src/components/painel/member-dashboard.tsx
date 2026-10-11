import Link from "next/link";
import { InstallPrompt } from "@/components/install-prompt";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { PainelBrandEyebrow } from "@/components/painel/painel-brand-eyebrow";
import { PainelPage } from "@/components/painel/painel-page";
import type { MemberDashboardStats, MemberNotification } from "@/lib/member/dashboard-stats";

type MemberDashboardProps = {
  firstName: string;
  stats: MemberDashboardStats;
};

const NOTIFICATION_STYLE: Record<
  MemberNotification["kind"],
  { label: string; className: string }
> = {
  correction: { label: "Correção", className: "border-purple/30 bg-purple/10" },
  deadline: { label: "Prazo", className: "border-amber-400/25 bg-amber-500/10" },
  resubmit: { label: "Reenvio", className: "border-sky-400/25 bg-sky-500/10" },
  support: { label: "Suporte", className: "border-emerald-400/25 bg-emerald-500/10" },
};

export function MemberDashboard({ firstName, stats }: MemberDashboardProps) {
  const hasEnrollments = stats.enrollmentCount > 0;

  return (
    <PainelPage>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PainelBrandEyebrow />
          <ThemeToggle />
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Olá, {firstName}
        </h1>
        <p className="mt-3 text-base leading-7 text-muted">
          Acompanhe editais, prazos, correções e avisos em um só lugar.
        </p>
      </div>

      <div className="panel-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Resumo</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4 sm:gap-2.5">
          <StatCard
            label="Editais"
            value={stats.enrollmentCount}
            hint={hasEnrollments ? "Ativos" : "Sem vínculo"}
          />
          <StatCard
            label="Com pendência"
            value={stats.phasesOpenCount}
            hint={
              stats.pendingActionCount > 0
                ? `${stats.pendingActionCount} fase(s) para enviar`
                : "Em dia"
            }
            accent={stats.pendingActionCount > 0}
          />
          <StatCard
            label="Na correção"
            value={stats.submittedForCorrection}
            hint={stats.submittedForCorrection > 0 ? "Com o corretor" : "Fila vazia"}
            accent={stats.submittedForCorrection > 0}
          />
          <StatCard
            label="Finalizadas"
            value={stats.finalizedActivitiesCount}
            hint="Nota definitiva"
          />
        </div>
      </div>

      {stats.phasesOpenCount > 0 ? (
        <p className="alert-warning">
          Você tem <strong>{stats.phasesOpenCount}</strong>{" "}
          {stats.phasesOpenCount === 1 ? "edital" : "editais"} com prazo em aberto e envio
          pendente.{" "}
          <Link href="/painel/editais">Ir para meus editais</Link>
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div className="panel-card h-full">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Avisos e notificações</h2>
          <Link href="/painel/suporte" className="text-sm font-medium text-purple hover:underline">
            Suporte
          </Link>
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          {stats.notifications.map((item) => {
            const style = NOTIFICATION_STYLE[item.kind];
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`block rounded-xl border px-4 py-3 transition hover:brightness-110 ${style.className}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {style.label}
                  </p>
                  <p className="mt-1 font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted">{item.body}</p>
                </Link>
              </li>
            );
          })}
          {!stats.notifications.length ? (
            <li className="text-sm text-muted">Nenhum aviso no momento. Tudo em dia!</li>
          ) : null}
        </ul>
      </div>

      <div className="panel-card h-full">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Meus editais</h2>
          <Link href="/painel/editais" className="text-sm font-medium text-purple hover:underline">
            Ver todos
          </Link>
        </div>
        <ul className="mt-4 flex flex-col gap-3">
          {stats.enrollments.map((item) => (
            <li key={item.enrollmentId}>
              <Link
                href="/painel/editais"
                className="block rounded-2xl border border-white/10 bg-field/60 px-4 py-3 transition hover:border-purple/40"
              >
                <p className="font-medium">{item.editalTitle}</p>
                <p className="mt-1 text-sm text-muted">Cargo: {item.cargoName}</p>
                <p className="mt-2 text-xs text-muted">
                  {item.phasesOpen} fase(s) em aberto · {item.submissionsCount}{" "}
                  {item.submissionsCount === 1 ? "correção definitiva" : "correções definitivas"}
                </p>
                {item.averageGrade != null ? (
                  <p className="mt-1.5 text-sm font-medium tabular-nums">
                    Média: {item.averageGrade.toLocaleString("pt-BR")}
                    <span className="font-normal text-muted">
                      {" "}
                      · {item.phasesTotal} {item.phasesTotal === 1 ? "fase" : "fases"} no
                      edital
                    </span>
                  </p>
                ) : null}
                {item.nextDeadlineAt ? (
                  <p className="mt-1 text-xs text-muted">
                    Próximo prazo:{" "}
                    {new Date(item.nextDeadlineAt).toLocaleString("pt-BR")}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
          {!stats.enrollments.length ? (
            <li className="text-sm text-muted">
              Você ainda não foi vinculado a um edital. Quando o administrador liberar, aparece
              aqui.
            </li>
          ) : null}
        </ul>
        {hasEnrollments ? (
          <Link
            href="/painel/editais"
            className="btn-primary btn-sm btn-flat mt-6 inline-flex justify-center"
          >
            Enviar atividades
          </Link>
        ) : null}
      </div>
      </div>

      {stats.recentCorrections.length > 0 ? (
        <div className="panel-card">
          <h2 className="text-lg font-semibold">Últimas correções</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {stats.recentCorrections.map((item) => (
              <li key={item.submissionId}>
                <Link
                  href={`/painel/editais/correcao/${item.submissionId}`}
                  className="block rounded-xl border border-white/10 bg-field/50 px-3 py-2 text-sm transition hover:border-purple/40"
                >
                  <p className="font-medium">
                    {item.editalTitle} · Fase {item.phaseNumber}
                  </p>
                  <p className="mt-1 text-muted">{item.phaseTitle}</p>
                  <p className="mt-1 text-xs text-muted">
                    Nota {item.grade ?? "—"} ·{" "}
                    {new Date(item.updatedAt).toLocaleString("pt-BR")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="max-w-xs">
        <InstallPrompt />
      </div>
    </PainelPage>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent = false,
  className = "",
}: {
  label: string;
  value: number | string;
  hint: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 sm:px-3.5 sm:py-3 ${
        accent
          ? "border-purple/35 bg-purple/10"
          : "border-white/10 bg-field/50"
      } ${className}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium leading-tight text-muted sm:text-xs">{label}</p>
        <p className="text-xl font-semibold tabular-nums sm:text-2xl">{value}</p>
      </div>
      <p className="mt-1 text-[10px] leading-snug text-muted sm:text-[11px]">{hint}</p>
    </div>
  );
}
