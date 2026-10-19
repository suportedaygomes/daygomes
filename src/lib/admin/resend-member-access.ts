import { generateTemporaryPassword } from "@/lib/auth/password";
import { sendAccessEmail } from "@/lib/email/send-access-email";
import { SITE_DISPLAY_NAME } from "@/lib/legal/site";
import { createAdminClient } from "@/lib/supabase/admin";

export async function resendMemberAccessWithNewPassword(memberId: string) {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", memberId)
    .maybeSingle();

  if (!profile || profile.role !== "membro") {
    return { ok: false as const, message: "Membro não encontrado." };
  }

  const email = profile.email?.trim().toLowerCase();
  if (!email) {
    return { ok: false as const, message: "Este membro não tem e-mail cadastrado." };
  }

  const temporaryPassword = generateTemporaryPassword();
  const { error: authError } = await admin.auth.admin.updateUserById(memberId, {
    password: temporaryPassword,
  });

  if (authError) {
    return {
      ok: false as const,
      message: "Não foi possível definir a nova senha. Verifique se a conta existe no login.",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const emailResult = await sendAccessEmail({
    to: email,
    fullName: profile.full_name?.trim() || "Aluno",
    loginUrl: `${siteUrl.replace(/\/$/, "")}/login`,
    password: temporaryPassword,
    source: "admin",
  });

  await admin.from("kiwify_access_emails").insert({
    profile_id: memberId,
    recipient_email: email,
    subject: `Seu acesso à ${SITE_DISPLAY_NAME} foi liberado`,
    status: emailResult.ok ? "sent" : "failed",
    error_message: emailResult.ok ? null : emailResult.error,
    order_id: null,
  });

  if (!emailResult.ok) {
    return {
      ok: false as const,
      message: `Senha atualizada, mas o e-mail não foi enviado: ${emailResult.error}`,
    };
  }

  return {
    ok: true as const,
    message: `Nova senha enviada para ${email}.`,
  };
}
