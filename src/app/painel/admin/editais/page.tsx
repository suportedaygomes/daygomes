import Link from "next/link";
import { redirect } from "next/navigation";
import { PainelPage } from "@/components/painel/painel-page";
import { getCurrentProfile } from "@/lib/auth/profile";
import { formatEditalDefaultCorrectionQuota } from "@/components/editais/correction-quota-select";
import { normalizeCorrectionQuota } from "@/lib/editais/enrollment-quota";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminEditaisPage() {
  const { profile } = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/painel");

  const supabase = await createClient();
  const { data: editais } = await supabase
    .from("editais")
    .select("id, title, is_active, created_at, default_correction_quota")
    .order("created_at", { ascending: false });

  return (
    <PainelPage gap="lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Editais</h1>
          <p className="mt-2 text-muted">Crie editais, cargos, fases e vincule membros.</p>
        </div>
        <Link href="/painel/admin/editais/novo" className="btn-primary">
          Novo edital
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {(editais ?? []).map((edital) => (
          <Link
            key={edital.id}
            href={`/painel/admin/editais/${edital.id}`}
            className="panel-card transition hover:border-purple/40"
          >
            <p className="font-semibold">{edital.title}</p>
            <p className="mt-1 text-sm text-muted">
              {edital.is_active ? "Ativo" : "Inativo"} ·{" "}
              {formatEditalDefaultCorrectionQuota(
                normalizeCorrectionQuota(edital.default_correction_quota),
              )}{" "}
              · {new Date(edital.created_at).toLocaleDateString("pt-BR")}
            </p>
          </Link>
        ))}
        {!editais?.length ? (
          <p className="text-sm text-muted">Nenhum edital cadastrado ainda.</p>
        ) : null}
      </div>
    </PainelPage>
  );
}
