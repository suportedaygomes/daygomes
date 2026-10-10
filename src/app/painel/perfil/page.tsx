import { redirect } from "next/navigation";
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
    <section className="max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">Meu perfil</h1>
      <p className="mt-2 text-muted">
        Atualize sua foto, data de nascimento e senha quando quiser.
      </p>
      <div className="mt-8">
        <ProfileSettingsForm
          email={user.email ?? ""}
          fullName={getDisplayName(user, profile)}
          cpf={profile.cpf}
          role={profile.role}
          birthDate={profile.birth_date}
          avatarUrl={getAvatarPublicUrl(url, profile.avatar_path)}
        />
      </div>
    </section>
  );
}
