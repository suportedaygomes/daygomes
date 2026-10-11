"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { normalizeWhatsapp } from "@/lib/support/validate";
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
  revalidatePath("/painel/corretores");
  return { ok: true, message: "Data de nascimento atualizada." };
}

export async function updateWhatsapp(whatsapp: string) {
  const { user, profile } = await getCurrentProfile();

  if (!user || !profile || profile.banned) {
    return { ok: false, message: "Sessão inválida." };
  }

  const digits = normalizeWhatsapp(whatsapp);
  if (digits.length < 10) {
    return { ok: false, message: "Informe um WhatsApp válido com DDD." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ whatsapp: digits, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return { ok: false, message: "Não foi possível salvar o WhatsApp." };
  }

  revalidatePath("/painel/perfil");
  revalidatePath("/painel/suporte");
  return { ok: true, message: "WhatsApp atualizado." };
}

const MAX_BIO_LENGTH = 2000;

export async function updateProfileBio(bio: string) {
  const { user, profile } = await getCurrentProfile();

  if (!user || !profile || profile.banned) {
    return { ok: false, message: "Sessão inválida." };
  }

  if (profile.role !== "corretor" && profile.role !== "admin") {
    return { ok: false, message: "Acesso negado." };
  }

  const value = bio.trim();
  if (value.length > MAX_BIO_LENGTH) {
    return {
      ok: false,
      message: `A descrição deve ter no máximo ${MAX_BIO_LENGTH} caracteres.`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ bio: value || null, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return { ok: false, message: "Não foi possível salvar a descrição." };
  }

  revalidatePath("/painel/perfil");
  revalidatePath("/painel/corretores");
  return { ok: true, message: "Descrição atualizada." };
}
