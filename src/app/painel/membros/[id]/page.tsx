import Link from "next/link";
import { redirect } from "next/navigation";
import { MemberContactCard } from "@/components/painel/member-contact-card";
import { StaffMemberEnrollmentsPanel } from "@/components/painel/staff-member-enrollments-panel";
import { PainelPage } from "@/components/painel/painel-page";
import { getCurrentProfile } from "@/lib/auth/profile";
import {
  getStaffMemberContact,
  isStaffRole,
} from "@/lib/members/staff-member-profile";
import { listStaffMemberEnrollments } from "@/lib/members/staff-member-enrollments";
import { createClient } from "@/lib/supabase/server";
import { themeLabel } from "@/lib/editais/theme-label";

export const dynamic = "force-dynamic";

export default async function StaffMembroDetailPage({
  params,
}: PageProps<"/painel/membros/[id]">) {
  const { id } = await params;
  const { profile } = await getCurrentProfile();
  if (!profile || !isStaffRole(profile.role)) {
    redirect("/painel");
  }

  const member = await getStaffMemberContact(id, profile);
  if (!member) {
    redirect("/painel/membros");
  }

  const enrollments = await listStaffMemberEnrollments(id);

  const supabase = await createClient();
  const { data: submissions } = await supabase
    .from("phase_submissions")
    .select("id, status, submitted_at, edital_phases(title, phase_number)")
    .eq("member_id", id)
    .order("submitted_at", { ascending: false })
    .limit(10);

  return (
    <PainelPage>
      <div>
        <Link href="/painel/membros" className="text-sm text-muted hover:text-foreground">
          ← Voltar aos membros
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          {member.full_name?.trim() || "Membro"}
        </h1>
      </div>

      <MemberContactCard member={member} />

      <StaffMemberEnrollmentsPanel enrollments={enrollments} />

      <section className="panel-card">
        <h2 className="text-lg font-semibold">Envios recentes</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {(submissions ?? []).map((submission) => {
            const phase = Array.isArray(submission.edital_phases)
              ? submission.edital_phases[0]
              : submission.edital_phases;
            return (
              <li key={submission.id}>
                <Link
                  href={`/painel/correcoes/${submission.id}`}
                  className="block rounded-xl border border-white/10 bg-field/50 px-3 py-2 text-sm transition hover:border-purple/40"
                >
                  <p className="font-medium">
                    {phase?.title ?? "Tema"}
                    {phase?.phase_number != null ? ` · ${themeLabel(phase.phase_number)}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {submission.status} ·{" "}
                    {new Date(submission.submitted_at).toLocaleString("pt-BR")}
                  </p>
                </Link>
              </li>
            );
          })}
          {!submissions?.length ? (
            <p className="text-sm text-muted">Nenhum envio encontrado.</p>
          ) : null}
        </ul>
      </section>
    </PainelPage>
  );
}
