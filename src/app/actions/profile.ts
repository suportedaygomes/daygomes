"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export async function updateBirthDate(birthDate: string | null) {
  const { user, profile } = await getCurrentProfile();

  if (!user || !profile || profile.banned) {
    return { ok: false, message: "Sessão inválida." };
  }

  const value: string | null = birthDate?.trim() || null;

  if (value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return { ok: false, message: "Data de nascimento inválida." };
    }
    const parsed = new Date(`${value}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, message: "Data de nascimento inválida." };
    }
    const today = new Date();
    if (parsed > today) {
      return { ok: false, message: "A data não pode ser no futuro." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ birth_date: value, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return { ok: false, message: "Não foi possível salvar a data." };
  }

  revalidatePath("/painel/perfil");
  return { ok: true, message: "Data de nascimento atualizada." };
}
