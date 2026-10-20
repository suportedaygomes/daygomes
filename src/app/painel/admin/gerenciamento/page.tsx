import { redirect } from "next/navigation";
import { AdminInfrastructureUsagePanel } from "@/components/painel/admin-infrastructure-usage-panel";
import { PainelPage } from "@/components/painel/painel-page";
import { loadInfrastructureUsageReport } from "@/lib/admin/infrastructure-usage";
import { getCurrentProfile } from "@/lib/auth/profile";

export const dynamic = "force-dynamic";

export default async function AdminGerenciamentoPage() {
  const { profile } = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    redirect("/painel");
  }

  const report = await loadInfrastructureUsageReport();

  return (
    <PainelPage gap="lg">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Gerenciamento</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Limites de uso do Resend, Supabase e Cloudflare R2. Monitore antes de ultrapassar o plano
          gratuito e começar a pagar por armazenamento ou envios extras.
        </p>
      </div>

      <AdminInfrastructureUsagePanel report={report} />
    </PainelPage>
  );
}
