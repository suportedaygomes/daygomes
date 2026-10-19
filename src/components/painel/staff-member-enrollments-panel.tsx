import { AdminEnrollmentCorrectionQuotaEditor } from "@/components/painel/admin-enrollment-correction-quota-editor";
import type { StaffMemberEnrollmentSummary } from "@/lib/members/staff-member-enrollments";

type Props = {
  memberId: string;
  enrollments: StaffMemberEnrollmentSummary[];
  allowAdminQuotaEdit?: boolean;
};

function formatEnrolledAt(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function StaffMemberEnrollmentsPanel({
  memberId,
  enrollments,
  allowAdminQuotaEdit = false,
}: Props) {
  return (
    <section className="panel-card">
      <h2 className="text-lg font-semibold">Mentorias e correções</h2>
      <p className="mt-1 text-sm text-muted">
        Editais em que o aluno está inscrito e cota de correções do plano (compra Kiwify ou vínculo
        manual).
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        {enrollments.map((row) => (
          <li
            key={row.enrollmentId}
            className="rounded-xl border border-white/10 bg-field/40 px-4 py-3 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-semibold text-foreground">{row.editalTitle}</p>
              <p className="text-xs text-muted">Inscrição em {formatEnrolledAt(row.enrolledAt)}</p>
            </div>
            <p className="mt-2 text-muted">{row.planLabel}</p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted">Cota do plano</dt>
                <dd className="font-semibold tabular-nums">{row.correctionQuota}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Correções usadas</dt>
                <dd className="font-semibold tabular-nums">{row.correctionsUsed}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Disponíveis</dt>
                <dd className="font-semibold tabular-nums">
                  {row.correctionsRemaining} / {row.correctionQuota}
                </dd>
              </div>
            </dl>
            {allowAdminQuotaEdit ? (
              <AdminEnrollmentCorrectionQuotaEditor
                enrollmentId={row.enrollmentId}
                memberId={memberId}
                correctionQuota={row.correctionQuota}
                correctionsUsed={row.correctionsUsed}
                correctionsRemaining={row.correctionsRemaining}
              />
            ) : null}
          </li>
        ))}
        {!enrollments.length ? (
          <p className="text-sm text-muted">
            Nenhuma mentoria vinculada. Confira inscrição manual, Kiwify ou importação CSV.
          </p>
        ) : null}
      </ul>
    </section>
  );
}
