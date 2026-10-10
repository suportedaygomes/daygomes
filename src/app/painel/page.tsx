import { InstallPrompt } from "@/components/install-prompt";
import { getCurrentProfile, getDisplayName } from "@/lib/auth/profile";
import { ROLE_LABELS } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function PainelHomePage() {
  const { user, profile } = await getCurrentProfile();

  if (!user || !profile) {
    return null;
  }

  const name = getDisplayName(user, profile);

  return (
    <section className="panel-card max-w-xl">
      <p className="text-sm font-semibold tracking-[0.18em] text-beige uppercase">
        Painel
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Olá, {name.split(/\s+/)[0]}
      </h1>
      <p className="mt-4 text-base leading-7 text-muted">
        Você está conectado como {ROLE_LABELS[profile.role].toLowerCase()}. Use o menu
        acima para atualizar seu perfil
        {profile.role === "admin"
          ? ", gerenciar editais ou cadastrar novos usuários"
          : profile.role === "corretor"
            ? " e corrigir redações pendentes"
            : profile.role === "membro"
              ? " e enviar suas atividades nos editais"
              : ""}
        .
      </p>
      <div className="mt-8 max-w-xs">
        <InstallPrompt />
      </div>
    </section>
  );
}
