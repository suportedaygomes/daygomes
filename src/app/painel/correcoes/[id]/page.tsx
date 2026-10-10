import { redirect } from "next/navigation";
import { CorrectionForm } from "@/components/editais/correction-form";
import { getCurrentProfile } from "@/lib/auth/profile";
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

  const supabase = await createClient();
  const { data: submission } = await supabase
    .from("phase_submissions")
    .select("id, profiles(full_name), edital_phases(title)")
    .eq("id", id)
    .maybeSingle();

  if (!submission) redirect("/painel/correcoes");

  const member = Array.isArray(submission.profiles)
    ? submission.profiles[0]
    : submission.profiles;
  const phase = Array.isArray(submission.edital_phases)
    ? submission.edital_phases[0]
    : submission.edital_phases;

  const { data: correction } = await supabase
    .from("phase_corrections")
    .select("grade, feedback, errors_notes, next_phase_unlocked")
    .eq("submission_id", id)
    .maybeSingle();

  return (
    <section className="max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">Corrigir envio</h1>
      <div className="mt-8">
        <CorrectionForm
          submissionId={id}
          memberName={member?.full_name ?? "Aluno"}
          phaseTitle={phase?.title ?? "Fase"}
          downloadUrl={`/api/submissions/${id}/download`}
          initial={
            correction
              ? {
                  grade: correction.grade,
                  feedback: correction.feedback,
                  errorsNotes: correction.errors_notes,
                  nextPhaseUnlocked: correction.next_phase_unlocked,
                }
              : undefined
          }
        />
      </div>
    </section>
  );
}
