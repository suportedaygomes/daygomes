import Link from "next/link";
import { InstallPrompt } from "@/components/install-prompt";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { PainelBrandEyebrow } from "@/components/painel/painel-brand-eyebrow";
import { PainelPage } from "@/components/painel/painel-page";
import type { AdminDashboardStats } from "@/lib/admin/dashboard-stats";
import { themeLabel } from "@/lib/editais/theme-label";

type AdminDashboardProps = {
  firstName: string;
  stats: AdminDashboardStats;
};

export function AdminDashboard({ firstName, stats }: AdminDashboardProps) {
  const maxMonthCount = Math.max(1, ...stats.membersByMonth.map((item) => item.count));

  return (
    <PainelPage>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PainelBrandEyebrow suffix="Painel do admin" />
          <ThemeToggle />
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Olá, {firstName}
        </h1>
        <p className="mt-3 text-base leading-7 text-muted">
          Visão geral de membros, entradas na plataforma e pendências de envio.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Membros ativos"
          value={stats.activeMembersCount}
          hint="Não banidos · perfil membro"
        />
        <StatCard
          label="Novos este mês"
          value={stats.membersJoinedThisMonth}
          hint="Cadastros no mês atual"
        />
        <StatCard
          label="Correções na fila"
          value={stats.pendingCorrections}
          hint={stats.pendingCorrections > 0 ? "Aguardando corretor" : "Fila vazia"}
          accent={stats.pendingCorrections > 0}
        />
        <StatCard
          label="Prazos perdidos"
          value={stats.missedDeadlineCount}
          hint={
            stats.missedDeadlineMemberCount > 0
              ? `${stats.missedDeadlineMemberCount} membro(s) distintos`
              : "Nenhum envio em atraso"
          }
          accent={stats.missedDeadlineCount > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="panel-card h-full">
          <h2 className="text-lg font-semibold">Entradas por mês</h2>
          <p className="mt-1 text-sm text-muted">Novos membros nos últimos 6 meses.</p>
          <ul className="mt-4 flex flex-col gap-3">
            {stats.membersByMonth.map((item) => (
              <li key={item.key}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium capitalize">{item.label}</span>
                  <span className="tabular-nums text-muted">{item.count}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-field/80">
                  <div
                    className="h-full rounded-full bg-purple/70"
                    style={{ width: `${(item.count / maxMonthCount) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <Link
            href="/painel/admin/usuarios"
            className="mt-6 inline-block text-sm font-medium text-purple hover:underline"
          >
            Gerenciar usuários
          </Link>
        </div>

        <div className="panel-card h-full">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Próximas na fila</h2>
            <Link
              href="/painel/correcoes"
              className="text-sm font-medium text-purple hover:underline"
            >
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
        </div>
      </div>

      <div className="panel-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Sem envio no prazo</h2>
            <p className="mt-1 text-sm text-muted">
              Tema com prazo encerrado e atividade ainda pendente (sem envio ou reenvio
              obrigatório).
            </p>
          </div>
          {stats.missedDeadlineCount > stats.missedDeadlines.length ? (
            <p className="text-xs text-muted">
              Mostrando {stats.missedDeadlines.length} de {stats.missedDeadlineCount}
            </p>
          ) : null}
        </div>

        <ul className="mt-4 flex flex-col gap-3">
          {stats.missedDeadlines.map((item) => (
            <li key={`${item.memberId}-${item.phaseTitle}-${item.deadlineAt}`}>
              <Link
                href={`/painel/membros/${item.memberId}`}
                className="block rounded-2xl border border-white/10 bg-field/60 px-4 py-3 transition hover:border-amber-400/35"
              >
                <p className="font-medium">{item.memberName}</p>
                <p className="mt-1 text-sm">{item.editalTitle}</p>
                <p className="mt-1 text-sm text-muted">
                  Cargo: {item.cargoName} · {item.phaseTitle} ({themeLabel(item.phaseNumber)})
                </p>
                <p className="mt-1 text-xs text-muted">
                  Prazo encerrado em {new Date(item.deadlineAt).toLocaleString("pt-BR")}
                </p>
              </Link>
            </li>
          ))}
          {!stats.missedDeadlines.length ? (
            <li className="text-sm text-muted">
              Nenhum membro ativo com tema em atraso no momento.
            </li>
          ) : null}
        </ul>
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
