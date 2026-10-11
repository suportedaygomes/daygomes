import Link from "next/link";
import { redirect } from "next/navigation";
import { CorrectedSubmissionsView } from "@/components/corrector/corrected-submissions-view";
import { PainelPage } from "@/components/painel/painel-page";
import { getCurrentProfile } from "@/lib/auth/profile";
import { listCorrectedSubmissionsForStaff } from "@/lib/corrector/corrected-queue";

export const dynamic = "force-dynamic";

export default async function CorrecoesCorrigidasPage() {
  const { profile } = await getCurrentProfile();
  if (!profile || (profile.role !== "corretor" && profile.role !== "admin")) {
    redirect("/painel");
  }

  const submissions = await listCorrectedSubmissionsForStaff(profile);

  return (
    <PainelPage>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Corrigidas</h1>
          <p className="mt-2 text-muted">
            Redações já corrigidas. Abra para revisar ou alterar a correção.
          </p>
        </div>
        <Link href="/painel/correcoes" className="text-sm font-medium text-purple hover:underline">
          Voltar à fila pendente
        </Link>
      </div>

      <CorrectedSubmissionsView
        submissions={submissions}
        showCorrectorFilter={profile.role === "admin"}
      />
    </PainelPage>
  );
}
