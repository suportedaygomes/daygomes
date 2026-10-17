import Link from "next/link";
import { redirect } from "next/navigation";
import { CorrectionForm } from "@/components/editais/correction-form";
import { EditalAttachmentsPanel } from "@/components/editais/edital-attachments-panel";
import {
  listEditalAttachments,
  resolveEditalIdForSubmission,
} from "@/lib/editais/attachments";
import { loadEvaluationRubricForSubmission } from "@/lib/editais/load-evaluation-rubric";
import type { RubricScores } from "@/lib/editais/evaluation-rubric";
import { MemberContactCard } from "@/components/painel/member-contact-card";
import { PainelPage } from "@/components/painel/painel-page";
import { getCurrentProfile } from "@/lib/auth/profile";
import { loadCorrectionSubmissionForStaff } from "@/lib/corrector/load-correction-submission";
import { submissionMemberProfileEmbed } from "@/lib/corrector/submission-select";
import { getStaffMemberContact } from "@/lib/members/staff-member-profile";
import { correctionWhatsAppMessage } from "@/lib/support/whatsapp";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CorrecaoDetailPage({
  params,
}: PageProps<"/painel/correcoes/[id]">) {
  const { id } = await params;
  const { profile } = await getCurrentProfile();

  if (!profile || (profile.role !== "corretor" && profile.role !== "admin")) {
    redirect("/painel");
  }

  const access = await loadCorrectionSubmissionForStaff(id, profile);
  if (!access.ok) {
    if (access.code === "locked") {
      return (
        <PainelPage>
          <h1 className="text-3xl font-semibold tracking-tight">Atividade em uso</h1>
          <p className="mt-3 text-muted">
            Outro corretor já está corrigindo esta atividade.
          </p>
          <Link href="/painel/correcoes" className="btn-primary btn-sm mt-6 inline-flex">
            Voltar às correções
          </Link>
        </PainelPage>
      );
    }
    redirect("/painel/correcoes");
  }

  const supabase = await createClient();
  const { data: submission } = await supabase
    .from("phase_submissions")
    .select(`id, member_id, ${submissionMemberProfileEmbed}, edital_phases(title)`)
    .eq("id", id)
    .maybeSingle();

  if (!submission) redirect("/painel/correcoes");

  const memberContact = profile
    ? await getStaffMemberContact(submission.member_id, profile)
    : null;
  const member = Array.isArray(submission.profiles)
    ? submission.profiles[0]
    : submission.profiles;
  const phase = Array.isArray(submission.edital_phases)
    ? submission.edital_phases[0]
    : submission.edital_phases;

  const { data: correction } = await supabase
    .from("phase_corrections")
    .select(
      "grade, feedback, errors_notes, rubric_scores, next_phase_unlocked, allow_resubmit",
    )
    .eq("submission_id", id)
    .maybeSingle();

  const evaluationRubric = await loadEvaluationRubricForSubmission(id);
  const initialRubricScores =
    correction?.rubric_scores &&
    typeof correction.rubric_scores === "object" &&
    !Array.isArray(correction.rubric_scores)
      ? (correction.rubric_scores as RubricScores)
      : null;

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const correctionUrl = `${siteUrl}/painel/editais/correcao/${id}`;
  const whatsappMessage = correctionWhatsAppMessage({
    submissionId: id,
    correctionUrl,
  });

  const editalId = await resolveEditalIdForSubmission(id);
  const editalAttachments = editalId ? await listEditalAttachments(editalId) : [];

  return (
    <PainelPage>
      <h1 className="text-3xl font-semibold tracking-tight">Corrigir envio</h1>
      {editalId ? (
        <EditalAttachmentsPanel editalId={editalId} attachments={editalAttachments} />
      ) : null}
      {memberContact ? (
        <MemberContactCard
          member={memberContact}
          compact
          whatsappMessage={whatsappMessage}
        />
      ) : null}
      <div>
        <CorrectionForm
          submissionId={id}
          memberName={member?.full_name ?? "Aluno"}
          phaseTitle={phase?.title ?? "Fase"}
          downloadUrl={`/api/submissions/${id}/download`}
          evaluationRubric={evaluationRubric}
          initial={
            correction
              ? {
                  grade: correction.grade,
                  feedback: correction.feedback,
                  errorsNotes: correction.errors_notes,
                  rubricScores: initialRubricScores,
                  allowResubmit: correction.allow_resubmit,
                }
              : undefined
          }
        />
      </div>
    </PainelPage>
  );
}
