import type { InfrastructureUsageReport, UsageMetric } from "@/lib/admin/infrastructure-usage";

type Props = {
  report: InfrastructureUsageReport;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatUsed(metric: UsageMetric) {
  if (metric.unit === "bytes") return formatBytes(metric.used);
  return metric.used.toLocaleString("pt-BR");
}

function formatLimit(metric: UsageMetric) {
  if (metric.unit === "bytes") return formatBytes(metric.limit);
  return metric.limit.toLocaleString("pt-BR");
}

function percent(metric: UsageMetric) {
  if (metric.limit <= 0) return 0;
  return Math.min(100, Math.round((metric.used / metric.limit) * 100));
}

function barTone(warning?: string) {
  if (warning === "critical") return "bg-red-500";
  if (warning === "high") return "bg-amber-400";
  if (warning === "medium") return "bg-yellow-500";
  return "bg-purple";
}

function MetricRow({ metric }: { metric: UsageMetric }) {
  const pct = percent(metric);
  return (
    <li className="rounded-xl border border-white/10 bg-field/40 px-4 py-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{metric.label}</p>
        <p className="text-sm tabular-nums text-muted">
          <span className="font-semibold text-foreground">{formatUsed(metric)}</span>
          {" / "}
          {formatLimit(metric)}
          <span className="ml-2 text-purple-200">({pct}%)</span>
        </p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full transition-[width] ${barTone(metric.warning)}`} style={{ width: `${pct}%` }} />
      </div>
      {metric.detail ? <p className="mt-2 text-xs text-muted">{metric.detail}</p> : null}
      {metric.warning === "critical" || metric.warning === "high" ? (
        <p className="mt-2 text-xs font-medium text-amber-200">
          Atenção: uso elevado — risco de cobrança ou bloqueio se ultrapassar o plano.
        </p>
      ) : null}
    </li>
  );
}

export function AdminInfrastructureUsagePanel({ report }: Props) {
  const fetchedLabel = new Date(report.fetchedAt).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted">
        Acompanhamento dos principais serviços da plataforma. Atualizado em{" "}
        <time dateTime={report.fetchedAt}>{fetchedLabel}</time>.
      </p>

      {report.services.map((service) => (
        <section key={service.id} className="panel-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{service.title}</h2>
              <p className="mt-1 text-sm text-muted">
                {service.configured ? "Integração configurada" : "Integração incompleta ou ausente"}
              </p>
            </div>
            <a
              href={service.dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary btn-sm"
            >
              Abrir painel do provedor
            </a>
          </div>

          <ul className="mt-4 flex flex-col gap-3">
            {service.metrics.map((metric) => (
              <MetricRow key={metric.label} metric={metric} />
            ))}
          </ul>

          {service.notes.length ? (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-muted">
              {service.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
