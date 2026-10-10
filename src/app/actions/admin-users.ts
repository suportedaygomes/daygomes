"use server";

import { revalidatePath } from "next/cache";
import { isValidCpf, normalizeCpf } from "@/lib/cpf";
import { getCurrentProfile } from "@/lib/auth/profile";
import {
  DEFAULT_USER_PASSWORD,
  isUserRole,
  type UserRole,
} from "@/lib/roles";
import { sendAccessEmail } from "@/lib/email/send-access-email";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreateUserInput = {
  fullName: string;
  cpf: string;
  email: string;
  role: UserRole;
};

export async function createUserAsAdmin(input: CreateUserInput) {
  const { profile } = await getCurrentProfile();

  if (!profile || profile.role !== "admin" || profile.banned) {
    return { ok: false, message: "Acesso negado." };
  }

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const cpf = normalizeCpf(input.cpf);
  const role = input.role;

  if (!fullName || fullName.length < 3) {
    return { ok: false, message: "Informe o nome completo." };
  }

  if (!isValidCpf(cpf)) {
    return { ok: false, message: "CPF inválido." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "E-mail inválido." };
  }

  if (!isUserRole(role)) {
    return { ok: false, message: "Tipo de usuário inválido." };
  }

  const admin = createAdminClient();

  const { data: existingCpf } = await admin
    .from("profiles")
    .select("id")
    .eq("cpf", cpf)
    .maybeSingle();

  if (existingCpf) {
    return { ok: false, message: "Este CPF já está cadastrado." };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: DEFAULT_USER_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
      cpf,
    },
  });

  if (createError || !created.user) {
    const message = createError?.message.toLowerCase() ?? "";
    if (message.includes("already") || message.includes("registered")) {
      return { ok: false, message: "Este e-mail já está cadastrado." };
    }
    return { ok: false, message: "Não foi possível criar o usuário." };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: fullName,
      role,
      cpf,
      email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", created.user.id);

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, message: "Não foi possível salvar o perfil do usuário." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const emailResult = await sendAccessEmail({
    to: email,
    fullName,
    loginUrl: `${siteUrl}/login`,
    password: DEFAULT_USER_PASSWORD,
    source: "admin",
  });

  revalidatePath("/painel/admin/usuarios");
  return {
    ok: true,
    message: emailResult.ok
      ? `Usuário criado. E-mail de acesso enviado para ${email}.`
      : `Usuário criado, mas o e-mail não foi enviado (${emailResult.error}). Senha inicial: ${DEFAULT_USER_PASSWORD}`,
  };
}
