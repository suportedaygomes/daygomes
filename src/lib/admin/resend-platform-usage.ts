import { getResendDailyLimit, getResendReservedDaily } from "@/lib/admin/infrastructure-limits";
import { todayInSaoPaulo } from "@/lib/admin/sao-paulo-day";
import { createAdminClient } from "@/lib/supabase/admin";

function dayRangeSaoPaulo(dayLabel: string) {
  return {
    start: `${dayLabel}T00:00:00-03:00`,
    end: `${dayLabel}T23:59:59.999-03:00`,
  };
}

/** E-mails de acesso enviados com sucesso (inclui lote em massa, Kiwify, reenvio admin). */
export async function countAccessEmailsSentOnDay(
  admin: ReturnType<typeof createAdminClient>,
  dayLabel: string,
) {
  const { start, end } = dayRangeSaoPaulo(dayLabel);
  const { count } = await admin
    .from("kiwify_access_emails")
    .select("*", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("created_at", start)
    .lte("created_at", end);

  return count ?? 0;
}

export type ResendDailyUsage = {
  dayLabel: string;
  limit: number;
  reservedForOtherMail: number;
  accessEmailsSent: number;
  remainingTotal: number;
  /** Espaço sugerido para o lote em massa hoje (já desconta reserva e outros envios). */
  remainingForBulk: number;
};

export async function getResendDailyUsage(
  admin?: ReturnType<typeof createAdminClient>,
): Promise<ResendDailyUsage> {
  const client = admin ?? createAdminClient();
  const dayLabel = todayInSaoPaulo();
  const limit = getResendDailyLimit();
  const reservedForOtherMail = getResendReservedDaily();
  const accessEmailsSent = await countAccessEmailsSentOnDay(client, dayLabel);
  const remainingTotal = Math.max(0, limit - accessEmailsSent);
  const remainingForBulk = Math.max(0, remainingTotal);

  return {
    dayLabel,
    limit,
    reservedForOtherMail,
    accessEmailsSent,
    remainingTotal,
    remainingForBulk,
  };
}
