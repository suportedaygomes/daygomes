import { redirect } from "next/navigation";
import { BulkMemberAccessEmailPanel } from "@/components/painel/bulk-member-access-email-panel";
import { StaffMembersDirectoryView } from "@/components/painel/staff-members-directory-view";
import { getBulkMemberAccessEmailStatus } from "@/lib/admin/bulk-member-access-email";
import { PainelPage } from "@/components/painel/painel-page";
import { getCurrentProfile } from "@/lib/auth/profile";
import { listStaffMemberDirectory } from "@/lib/members/staff-member-directory";
import { isStaffRole } from "@/lib/members/staff-member-profile";

export const dynamic = "force-dynamic";

export default async function StaffMembrosPage() {
  const { profile } = await getCurrentProfile();
  if (!profile || !isStaffRole(profile.role)) {
    redirect("/painel");
  }

  const members = await listStaffMemberDirectory(profile);
  const bulkStatus =
    profile.role === "admin" ? await getBulkMemberAccessEmailStatus() : null;

  return (
    <PainelPage gap="lg">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Membros</h1>
        <p className="mt-2 text-muted">
          Todos os alunos com acesso à plataforma. Contato, editais vinculados e envio de atividades.
        </p>
      </div>

      {bulkStatus ? <BulkMemberAccessEmailPanel initialStatus={bulkStatus} /> : null}

      <StaffMembersDirectoryView members={members} />
    </PainelPage>
  );
}
