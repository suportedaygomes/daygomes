import { redirect } from "next/navigation";
import { CreateEditalForm } from "@/components/editais/create-edital-form";
import { PainelPage } from "@/components/painel/painel-page";
import { getCurrentProfile } from "@/lib/auth/profile";

export const dynamic = "force-dynamic";

export default async function NovoEditalPage() {
  const { profile } = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/painel");

  return (
    <PainelPage>
      <h1 className="text-3xl font-semibold tracking-tight">Novo edital</h1>
      <p className="mt-2 text-muted">
        Defina cargos, quantidade de vagas e os temas com prazo de envio.
      </p>
      <div className="mt-8">
        <CreateEditalForm />
      </div>
    </PainelPage>
  );
}
