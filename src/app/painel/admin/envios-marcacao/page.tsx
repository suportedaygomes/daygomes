import { redirect } from "next/navigation";
import { AdminMarkupSubmissionsPanel } from "@/components/painel/admin-markup-submissions-panel";
import { PainelPage } from "@/components/painel/painel-page";
import { loadMarkupSubmissionsReport } from "@/lib/admin/markup-submissions-report";
import { getCurrentProfile } from "@/lib/auth/profile";

export const dynamic = "force-dynamic";

export default async function AdminEnviosMarcacaoPage() {
  const { profile } = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    redirect("/painel");
  }

  const rows = await loadMarkupSubmissionsReport(100);

  return (
    <PainelPage gap="lg">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Envios com marcação</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Lista envios que têm grifos salvos, para localizar casos como preview em branco no celular.
          Linhas em destaque têm muitos grifos ou PDF (mais suscetível no mobile). O id do envio
          ajuda no suporte técnico.
        </p>
      </div>

      <AdminMarkupSubmissionsPanel rows={rows} />
    </PainelPage>
  );
}