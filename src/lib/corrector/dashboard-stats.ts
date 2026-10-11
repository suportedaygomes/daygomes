import { listPendingSubmissionsForStaff } from "@/lib/corrector/pending-queue";
import { createClient } from "@/lib/supabase/server";

export type CorrectorDashboardStats = {
  pendingTotal: number;
  pendingEnviado: number;
  pendingEmCorrecao: number;
  correctedByMe: number;
  correctedThisWeek: number;
  oldestPendingDays: number | null;
  recentPending: {
    id: string;
    memberName: string;
    phaseTitle: string;
    phaseNumber: number | null;
    submittedAt: string;
  }[];
};

function startOfWeekUtc() {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString();
}

export async function getCorrectorDashboardStats(
  correctorId: string,
): Promise<CorrectorDashboardStats> {
  const supabase = await createClient();
  const weekStart = startOfWeekUtc();

  const pending = await listPendingSubmissionsForStaff({
    id: correctorId,
    role: "corretor",
  });

  const pendingEnviado = pending.filter(
    (row) => row.status === "enviado" && !row.assigned_corrector_id,
  ).length;
  const pendingEmCorrecao = pending.filter(
    (row) => row.status === "em_correcao" && row.assigned_corrector_id === correctorId,
  ).length;

  let oldestPendingDays: number | null = null;
  const oldest = pending[0];
  if (oldest?.submitted_at) {
    const submitted = new Date(oldest.submitted_at).getTime();
    oldestPendingDays = Math.max(0, Math.floor((Date.now() - submitted) / 86_400_000));
  }

  const recentPending = pending.slice(0, 4).map((row) => ({
    id: row.id,
    memberName: row.memberName,
    phaseTitle: row.phaseTitle,
    phaseNumber: row.phaseNumber,
    submittedAt: row.submitted_at,
  }));

  const { count: correctedByMe } = await supabase
    .from("phase_corrections")
    .select("*", { count: "exact", head: true })
    .eq("corrector_id", correctorId);

  const { count: correctedThisWeek } = await supabase
    .from("phase_corrections")
    .select("*", { count: "exact", head: true })
    .eq("corrector_id", correctorId)
    .gte("updated_at", weekStart);

  return {
    pendingTotal: pending.length,
    pendingEnviado,
    pendingEmCorrecao,
    correctedByMe: correctedByMe ?? 0,
    correctedThisWeek: correctedThisWeek ?? 0,
    oldestPendingDays,
    recentPending,
  };
}
