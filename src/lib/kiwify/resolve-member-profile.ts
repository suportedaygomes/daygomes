import { generateTemporaryPassword } from "@/lib/auth/password";
import {
  formatSupabaseAuthError,
  isAuthEmailAlreadyRegistered,
} from "@/lib/auth/supabase-auth-error";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type ResolveMemberProfileResult =
  | {
      ok: true;
      profileId: string;
      createdUser: boolean;
      temporaryPassword?: string;
      cpfOmitted?: boolean;
    }
  | { ok: false; error: string; logDetail: string };

async function cpfBelongsToAnotherProfile(
  admin: AdminClient,
  cpf: string,
  exceptProfileId?: string,
) {
  const { data } = await admin.from("profiles").select("id").eq("cpf", cpf).maybeSingle();
  if (!data) return false;
  if (exceptProfileId && data.id === exceptProfileId) return false;
  return true;
}

async function findProfileIdByEmail(admin: AdminClient, email: string) {
  const { data } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  return data?.id ?? null;
}

async function findAuthUserIdByEmail(admin: AdminClient, email: string) {
  let page = 1;
  const perPage = 200;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.warn("[kiwify:resolve-member] listUsers failed", formatSupabaseAuthError(error));
      return null;
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match.id;

    if (data.users.length < perPage) break;
    page += 1;
    if (page > 50) break;
  }

  return null;
}

export async function resolveOrCreateMemberProfile(input: {
  admin: AdminClient;
  email: string;
  fullName: string;
  cpfValid: boolean;
  cpf: string;
}): Promise<ResolveMemberProfileResult> {
  const { admin, email, fullName, cpfValid, cpf } = input;

  let profileId = await findProfileIdByEmail(admin, email);
  let createdUser = false;
  let temporaryPassword: string | undefined;
  let cpfOmitted = false;

  const canAssignCpf =
    cpfValid && !(await cpfBelongsToAnotherProfile(admin, cpf, profileId ?? undefined));

  if (!canAssignCpf && cpfValid) {
    cpfOmitted = true;
  }

  if (profileId) {
    const updates: { cpf?: string; full_name: string } = { full_name: fullName };
    if (canAssignCpf) updates.cpf = cpf;
    await admin.from("profiles").update(updates).eq("id", profileId);
    return { ok: true, profileId, createdUser, cpfOmitted };
  }

  temporaryPassword = generateTemporaryPassword();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: "membro",
      ...(canAssignCpf ? { cpf } : {}),
    },
  });

  if (createError || !created.user) {
    if (createError && isAuthEmailAlreadyRegistered(createError)) {
      const authUserId = await findAuthUserIdByEmail(admin, email);
      if (authUserId) {
        profileId = authUserId;
        await admin
          .from("profiles")
          .update({
            full_name: fullName,
            role: "membro",
            email,
            cpf: canAssignCpf ? cpf : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profileId);
        return { ok: true, profileId, createdUser: false, cpfOmitted };
      }
    }

    const logDetail = formatSupabaseAuthError(createError);
    return {
      ok: false,
      error: "Não foi possível criar o usuário.",
      logDetail,
    };
  }

  profileId = created.user.id;
  createdUser = true;

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: fullName,
      role: "membro",
      email,
      cpf: canAssignCpf ? cpf : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (profileError) {
    console.error("[kiwify:resolve-member] profile update failed", profileError.message, profileId);
    await admin.auth.admin.deleteUser(profileId);
    return {
      ok: false,
      error: "Não foi possível salvar o perfil do usuário.",
      logDetail: profileError.message,
    };
  }

  return {
    ok: true,
    profileId,
    createdUser,
    temporaryPassword,
    cpfOmitted,
  };
}
