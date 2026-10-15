import Link from "next/link";
import { redirect } from "next/navigation";
import { CorrectorPublicCard } from "@/components/editais/corrector-public-card";
import { PainelPage } from "@/components/painel/painel-page";
import { MembroCorrecaoActions } from "@/components/editais/membro-correcao-actions";
import { SubmissionMarkupViewer } from "@/components/editais/submission-markup-viewer";
import { getAvatarPublicUrl, getCurrentProfile } from "@/lib/auth/profile";
import { parseSubmissionGrade } from "@/lib/editais/grades";
import { getCorrectorPublicProfile } from "@/lib/corrector/public-profile";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import type { MarkupAnnotation } from "@/lib/markup/types";
import { getAnnotatorViewerMode } from "@/lib/submissions/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function parseAnnotations(value: unknown): MarkupAnnotation[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object" && "id" in item)
    .map((item) => {
      const row = item as MarkupAnnotation;
      return { ...row, page: row.page && row.page > 0 ? row.page : 1 };
    });
}

export default async function MembroCorrecaoDetalhePage({
  params,
}: PageProps<"/painel/editais/correcao/[id]">) {
  const { id } = await params;
  const { user, profile } = await getCurrentProfile();

  if (!user || !profile) redirect("/login");
  if (profile.role !== "membro") redirect("/painel");

  const supabase = await createClient();
  const { data: submission } = await supabase
    .from("phase_submissions")
    .select(
      "id, member_id, status, mime_type, storage_path, preview_storage_path, original_filename, edital_phases(title, phase_number)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!submission || submission.member_id !== user.id) {
    redirect("/painel/editais");
  }

  if (submission.status !== "corrigido") {
    redirect("/painel/editais");
  }

  const admin = createAdminClient();
  const { data: correction } = await admin
    .from("phase_corrections")
    .select("grade, feedback, errors_notes, corrector_id")
    .eq("submission_id", id)
    .maybeSingle();

  const corrector = await getCorrectorPublicProfile(correction?.corrector_id);
  const { url: supabaseUrl } = getSupabasePublicEnv();
  const correctorAvatarUrl = corrector
    ? getAvatarPublicUrl(supabaseUrl, corrector.avatarPath)
    : null;

  const { data: markups } = await supabase
    .from("submission_markups")
    .select("annotations")
    .eq("submission_id", id)
    .maybeSingle();

  const phase = Array.isArray(submission.edital_phases)
    ? submission.edital_phases[0]
    : submission.edital_phases;

  const viewerMode = getAnnotatorViewerMode(submission);
  const annotations = parseAnnotations(markups?.annotations);

  return (
    <PainelPage>
      <div>
        <Link href="/painel/editais" className="text-sm text-muted hover:text-foreground">
          ← Voltar aos editais
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Correção da atividade</h1>
        <p className="mt-2 text-muted">
          {phase?.title ?? "Fase"}
          {phase?.phase_number != null ? ` · Fase ${phase.phase_number}` : ""}
        </p>
      </div>

      {corrector ? (
        <CorrectorPublicCard corrector={corrector} avatarUrl={correctorAvatarUrl} />
      ) : null}

      <section className="panel-card flex flex-col gap-3 text-sm">
        <p>
          <strong>Nota:</strong> {parseSubmissionGrade(correction?.grade) ?? "—"}
        </p>
        <p><strong>Feedback:</strong> {correction?.feedback || "—"}</p>
        <p>
          <strong>Comentários técnicos do professor:</strong> {correction?.errors_notes || "—"}
        </p>
      </section>

      <MembroCorrecaoActions submissionId={id} />

      <SubmissionMarkupViewer
        previewUrl={`/api/submissions/${id}/preview`}
        viewerMode={viewerMode}
        annotations={annotations}
      />
    </PainelPage>
  );
}
