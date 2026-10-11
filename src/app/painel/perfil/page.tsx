import { redirect } from "next/navigation";
import { PainelPage } from "@/components/painel/painel-page";
import { ProfileSettingsForm } from "@/components/painel/profile-settings-form";
import {
  getAvatarPublicUrl,
  getCurrentProfile,
  getDisplayName,
} from "@/lib/auth/profile";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const { user, profile } = await getCurrentProfile();
  const { url } = getSupabasePublicEnv();

  if (!user || !profile) {
    redirect("/login");
  }

  return (
    <PainelPage>
      <h1 className="text-3xl font-semibold tracking-tight">Meu perfil</h1>
      <p className="-mt-4 text-muted">
        {profile.role === "corretor" || profile.role === "admin"
          ? "Atualize foto, apresentação profissional e senha. Os alunos veem sua foto ao receber correções."
          : "Atualize sua foto, data de nascimento e senha quando quiser."}
      </p>
      <ProfileSettingsForm
          email={user.email ?? ""}
          fullName={getDisplayName(user, profile)}
          cpf={profile.cpf}
          role={profile.role}
          birthDate={profile.birth_date}
          whatsapp={profile.whatsapp}
          bio={profile.bio}
          avatarUrl={getAvatarPublicUrl(url, profile.avatar_path)}
        />
    </PainelPage>
  );
}
