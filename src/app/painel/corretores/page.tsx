import { redirect } from "next/navigation";
import { CorrectorDirectoryCard } from "@/components/painel/corrector-directory-card";
import { PainelPage } from "@/components/painel/painel-page";
import { getAvatarPublicUrl, getCurrentProfile } from "@/lib/auth/profile";
import { listCorrectorDirectoryEntries } from "@/lib/corrector/directory";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function MembroCorretoresPage() {
  const { profile } = await getCurrentProfile();
  if (!profile || profile.role !== "membro") {
    redirect("/painel");
  }

  const { url: supabaseUrl } = getSupabasePublicEnv();
  const correctors = await listCorrectorDirectoryEntries();

  return (
    <PainelPage>
      <h1 className="text-3xl font-semibold tracking-tight">Nossa equipe de correção</h1>
      <p className="mt-2 text-muted">
        Conheça quem corrige suas redações: contato, apresentação e perfil de cada corretor.
      </p>

      <ul className="mt-8 grid gap-5 lg:grid-cols-2">
        {correctors.map((corrector) => (
          <li key={corrector.id}>
            <CorrectorDirectoryCard
              corrector={corrector}
              avatarUrl={getAvatarPublicUrl(supabaseUrl, corrector.avatarPath)}
            />
          </li>
        ))}
        {!correctors.length ? (
          <li className="text-sm text-muted">Nenhum corretor cadastrado no momento.</li>
        ) : null}
      </ul>
    </PainelPage>
  );
}
