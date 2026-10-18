import Link from "next/link";
import { InstallPrompt } from "@/components/install-prompt";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { PainelBrandEyebrow } from "@/components/painel/painel-brand-eyebrow";
import { PainelPage } from "@/components/painel/painel-page";
import type { CorrectorDashboardStats } from "@/lib/corrector/dashboard-stats";
import { themeLabel } from "@/lib/editais/theme-label";

type CorrectorDashboardProps = {
  firstName: string;
  stats: CorrectorDashboardStats;
};

export function CorrectorDashboard({ firstName, stats }: CorrectorDashboardProps) {
  return (
    <PainelPage>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PainelBrandEyebrow suffix="Painel do corretor" />
          <ThemeToggle />
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Olá, {firstName}
        </h1>
        <p className="mt-3 text-base leading-7 text-muted">
          Acompanhe a fila de correções e seu desempenho na plataforma.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Pendentes"
          value={stats.pendingTotal}
          hint={
            stats.pendingTotal > 0
              ? `${stats.pendingEnviado} novas · ${stats.pendingEmCorrecao} em andamento`
              : "Nenhuma redação na fila"
          }
          accent={stats.pendingTotal > 0}
        />
        <StatCard
          label="Corrigidas por você"
          value={stats.correctedByMe}
          hint={`${stats.correctedThisWeek} nesta semana`}
        />
      </div>

      {stats.oldestPendingDays !== null && stats.pendingTotal > 0 ? (
        <p className="alert-warning">
          A correção mais antiga na fila aguarda há{" "}
          <strong>
            {stats.oldestPendingDays === 0
              ? "menos de 1 dia"
              : `${stats.oldestPendingDays} dia${stats.oldestPendingDays === 1 ? "" : "s"}`}
          </strong>
          .
        </p>
      ) : null}

      <div className="panel-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Próximas na fila</h2>
          <Link href="/painel/correcoes" className="text-sm font-medium text-purple hover:underline">
            Ver todas
          </Link>
        </div>

        <ul className="mt-4 flex flex-col gap-3">
          {stats.recentPending.map((item) => (
            <li key={item.id}>
              <Link
                href={`/painel/correcoes/${item.id}`}
                className="block rounded-2xl border border-white/10 bg-field/60 px-4 py-3 transition hover:border-purple/40"
              >
                <p className="font-medium">{item.memberName}</p>
                <p className="mt-1 text-sm text-muted">
                  {item.phaseTitle}
                  {item.phaseNumber != null ? ` · ${themeLabel(item.phaseNumber)}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Enviado em {new Date(item.submittedAt).toLocaleString("pt-BR")}
                </p>
              </Link>
            </li>
          ))}
          {!stats.recentPending.length ? (
            <li className="text-sm text-muted">Nenhum envio pendente no momento.</li>
          ) : null}
        </ul>

        {stats.pendingTotal > 0 ? (
          <Link href="/painel/correcoes" className="btn-primary mt-6 inline-flex justify-center">
            Ir para correções
          </Link>
        ) : null}
      </div>

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
}: {
  label: string;
  value: number | string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`panel-card ${accent ? "border-purple/35 ring-1 ring-purple/20" : ""}`}
    >
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{hint}</p>
    </div>
  );
}
