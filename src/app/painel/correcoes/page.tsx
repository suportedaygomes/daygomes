import Link from "next/link";
import { redirect } from "next/navigation";
import { CorrectionsQueueView } from "@/components/corrector/corrections-queue-view";
import { PainelPage } from "@/components/painel/painel-page";
import { getCurrentProfile } from "@/lib/auth/profile";
import { listPendingSubmissionsForStaff } from "@/lib/corrector/pending-queue";

export const dynamic = "force-dynamic";

export default async function CorrecoesPage() {
  const { profile } = await getCurrentProfile();
  if (!profile || (profile.role !== "corretor" && profile.role !== "admin")) {
    redirect("/painel");
  }

  const submissions = await listPendingSubmissionsForStaff(profile);

  return (
    <PainelPage>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Correções</h1>
          <p className="mt-2 text-muted">
            Todas as correções pendentes ficam visíveis na fila. Ao abrir uma livre, ela fica
            reservada para você; use &quot;Devolver à fila&quot; para liberar.
          </p>
        </div>
        <Link
          href="/painel/correcoes/corrigidas"
          className="text-sm font-medium text-purple hover:underline"
        >
          Ver corrigidas
        </Link>
      </div>

      <CorrectionsQueueView
        submissions={submissions}
        viewerId={profile.id}
        viewerRole={profile.role}
      />
    </PainelPage>
  );
}
