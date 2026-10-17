export type MemberPhaseStatusInput = {
  deadlineAt: string;
  submissionStatus: "enviado" | "em_correcao" | "corrigido" | null;
  allowResubmit: boolean;
  quotaBlocksNewUpload: boolean;
};

export type MemberPhaseBucket =
  | "corrected"
  | "awaiting"
  | "resubmit"
  | "available"
  | "quota_blocked"
  | "expired";

export const MEMBER_PHASE_BUCKET_LABEL: Record<MemberPhaseBucket, string> = {
  corrected: "Corrigida",
  awaiting: "Aguardando correção",
  resubmit: "Reenvio liberado",
  available: "Pode enviar",
  quota_blocked: "Sem cota",
  expired: "Prazo encerrado",
};

export function classifyMemberPhase(phase: MemberPhaseStatusInput): MemberPhaseBucket {
  const expired = new Date(phase.deadlineAt).getTime() < Date.now();

  if (phase.submissionStatus === "enviado" || phase.submissionStatus === "em_correcao") {
    return "awaiting";
  }
  if (phase.submissionStatus === "corrigido") {
    return phase.allowResubmit ? "resubmit" : "corrected";
  }
  if (phase.quotaBlocksNewUpload) return "quota_blocked";
  if (expired) return "expired";
  return "available";
}

export function memberPhaseBucketClass(bucket: MemberPhaseBucket): string {
  switch (bucket) {
    case "corrected":
      return "bg-emerald-500/15 text-emerald-100 ring-emerald-400/30";
    case "awaiting":
      return "bg-amber-500/15 text-amber-100 ring-amber-400/30";
    case "resubmit":
      return "bg-sky-500/15 text-sky-100 ring-sky-400/30";
    case "available":
      return "bg-purple/20 text-purple ring-purple/30";
    case "quota_blocked":
      return "bg-white/10 text-muted ring-white/15";
    case "expired":
      return "bg-red-500/10 text-red-200 ring-red-400/20";
  }
}
