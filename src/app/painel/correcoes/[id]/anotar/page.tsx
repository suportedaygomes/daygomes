import Link from "next/link";
import { redirect } from "next/navigation";
import { SubmissionAnnotator } from "@/components/editais/submission-annotator";
import { PainelPage } from "@/components/painel/painel-page";
import { getCurrentProfile } from "@/lib/auth/profile";
import { loadCorrectionSubmissionForStaff } from "@/lib/corrector/load-correction-submission";
import { submissionMemberProfileEmbed } from "@/lib/corrector/submission-select";
import { getAnnotatorViewerMode } from "@/lib/submissions/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AnotarEnvioPage({
  params,
}: PageProps<"/painel/correcoes/[id]/anotar">) {
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
    .select(
      `id, member_id, mime_type, storage_path, preview_storage_path, ${submissionMemberProfileEmbed}, edital_phases(title, description)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!submission) redirect("/painel/correcoes");

  const member = Array.isArray(submission.profiles)
    ? submission.profiles[0]
    : submission.profiles;
  const phase = Array.isArray(submission.edital_phases)
    ? submission.edital_phases[0]
    : submission.edital_phases;

  const viewerMode = getAnnotatorViewerMode(submission);

  return (
    <div className="relative right-1/2 left-1/2 -mr-[50vw] -ml-[50vw] -mt-5 w-screen max-w-[100vw] px-3 pb-8 sm:-mt-8 sm:px-4 lg:px-5">
      <SubmissionAnnotator
        submissionId={id}
        previewUrl={`/api/submissions/${id}/preview?source=original`}
        fallbackPreviewUrl={
          submission.preview_storage_path &&
          submission.preview_storage_path !== submission.storage_path
            ? `/api/submissions/${id}/preview?source=original`
            : undefined
        }
        viewerMode={viewerMode}
        memberName={member?.full_name ?? "Aluno"}
        phaseTitle={phase?.title ?? "Tema"}
        phaseDescription={phase?.description ?? ""}
      />
    </div>
  );
}
