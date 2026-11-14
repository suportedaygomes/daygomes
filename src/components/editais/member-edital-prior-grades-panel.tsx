import Link from "next/link";
import type { MemberEditalPriorGrades } from "@/lib/corrector/member-edital-prior-grades";

type Props = {
  prior: MemberEditalPriorGrades;
};

export function MemberEditalPriorGradesPanel({ prior }: Props) {
  if (!prior.grades.length) {
    return null;
  }

  return (
    <section className="panel-card flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">Notas anteriores neste edital</h2>
        <p className="mt-1 text-sm text-muted">
          <strong className="font-medium text-foreground">{prior.editalTitle}</strong> — outras
          atividades já corrigidas deste aluno no mesmo edital.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {prior.grades.map((item) => (
          <li
            key={item.submissionId}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2.5 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {item.themeLabel}: {item.phaseTitle}
              </p>
              <p className="text-xs text-muted">{item.trackLabel}</p>
              {item.correctedAt ? (
                <p className="mt-1 text-xs text-muted">
                  Corrigido em{" "}
                  {new Date(item.correctedAt).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-lg font-semibold tabular-nums text-emerald-200">
                {item.grade.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
              </span>
              <Link
                href={`/painel/correcoes/${item.submissionId}`}
                className="text-xs font-medium text-purple hover:underline"
              >
                Ver correção
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}