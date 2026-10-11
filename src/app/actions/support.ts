"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createAdminClient } from "@/lib/supabase/admin";

const STATUSES = new Set(["aberto", "em_atendimento", "resolvido"]);

export async function updateSupportTicket(input: {
  ticketId: string;
  status: string;
  staffNotes: string;
}) {
  const { user, profile } = await getCurrentProfile();

  if (!user || !profile || profile.banned) {
    return { ok: false, message: "Sessão inválida." };
  }

  if (profile.role !== "corretor" && profile.role !== "admin") {
    return { ok: false, message: "Acesso negado." };
  }

  const status = input.status.trim();
  if (!STATUSES.has(status)) {
    return { ok: false, message: "Status inválido." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("support_tickets")
    .update({
      status,
      staff_notes: input.staffNotes.trim(),
      handled_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.ticketId);

  if (error) {
    return { ok: false, message: "Não foi possível atualizar o chamado." };
  }

  revalidatePath("/painel/suporte/atendimento");
  revalidatePath(`/painel/suporte/atendimento/${input.ticketId}`);
  return { ok: true, message: "Chamado atualizado." };
}

export async function memberResolveSupportTicket(ticketId: string) {
  const { user, profile } = await getCurrentProfile();

  if (!user || !profile || profile.banned) {
    return { ok: false, message: "Sessão inválida." };
  }

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("support_tickets")
    .select("id, member_id, status")
    .eq("id", ticketId)
    .maybeSingle();

  if (!ticket || ticket.member_id !== user.id) {
    return { ok: false, message: "Chamado não encontrado." };
  }

  if (ticket.status === "resolvido") {
    return { ok: false, message: "Este chamado já está encerrado." };
  }

  const { error } = await admin
    .from("support_tickets")
    .update({ status: "resolvido", updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) {
    return { ok: false, message: "Não foi possível encerrar o chamado." };
  }

  revalidatePath("/painel/suporte");
  revalidatePath(`/painel/suporte/chamado/${ticketId}`);
  return { ok: true, message: "Chamado encerrado. Obrigado!" };
}
