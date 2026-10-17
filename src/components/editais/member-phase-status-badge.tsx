import {
  classifyMemberPhase,
  MEMBER_PHASE_BUCKET_LABEL,
  memberPhaseBucketClass,
} from "@/lib/editais/member-phase-status";
import type { MemberPhaseStatusInput } from "@/lib/editais/member-phase-status";

type Props = {
  phase: MemberPhaseStatusInput;
};

export function MemberPhaseStatusBadge({ phase }: Props) {
  const bucket = classifyMemberPhase(phase);
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${memberPhaseBucketClass(bucket)}`}
    >
      {MEMBER_PHASE_BUCKET_LABEL[bucket]}
    </span>
  );
}
