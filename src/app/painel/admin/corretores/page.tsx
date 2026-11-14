import { redirect } from "next/navigation";
import { AdminCorrectorProductivityPanel } from "@/components/painel/admin-corrector-productivity-panel";
import { PainelPage } from "@/components/painel/painel-page";
import {
  dateRangeFromYearMonthParams,
  defaultCorrectorReportDateRange,
  parseDateRangeParams,
} from "@/lib/admin/month-range-sao-paulo";
import { loadCorrectorProductivityReport } from "@/lib/admin/corrector-productivity-report";
import { todayInSaoPaulo } from "@/lib/admin/sao-paulo-day";
import { getCurrentProfile } from "@/lib/auth/profile";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ de?: string; ate?: string; ano?: string; mes?: string }>;
};

export default async function AdminCorretoresPage({ searchParams }: PageProps) {
  const { profile } = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    redirect("/painel");
  }

  const params = await searchParams;
  const fallback = defaultCorrectorReportDateRange();

  let range = parseDateRangeParams(params.de, params.ate, fallback);

  if (!params.de && !params.ate && (params.ano || params.mes)) {
    range = dateRangeFromYearMonthParams(params.ano, params.mes, fallback);
  }

  const report = await loadCorrectorProductivityReport(range.dateFrom, range.dateTo);

  return (
    <PainelPage gap="lg">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Produtividade dos corretores</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Contagem de correções publicadas por corretor, com intervalo de datas (horário de Brasília).
          Use data inicial e final para ver semanas, meses ou qualquer período. Cada atividade
          corrigida conta uma vez; reajustes no mesmo envio usam a data da última publicação.
        </p>
      </div>

      <AdminCorrectorProductivityPanel report={report} todayDate={todayInSaoPaulo()} />
    </PainelPage>
  );
}