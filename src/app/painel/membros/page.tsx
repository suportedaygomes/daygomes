import Link from "next/link";
import { redirect } from "next/navigation";
import { PainelPage } from "@/components/painel/painel-page";
import { formatCpf } from "@/lib/cpf";
import { getCurrentProfile } from "@/lib/auth/profile";
import {
  isStaffRole,
  listStaffMemberContacts,
} from "@/lib/members/staff-member-profile";

export const dynamic = "force-dynamic";

export default async function StaffMembrosPage() {
  const { profile } = await getCurrentProfile();
  if (!profile || !isStaffRole(profile.role)) {
    redirect("/painel");
  }

  const members = await listStaffMemberContacts(profile);

  return (
    <PainelPage>
      <h1 className="text-3xl font-semibold tracking-tight">Membros</h1>
      <p className="mt-2 text-muted">
        Alunos que já enviaram atividades na plataforma. Dados de contato para suporte e
        correção.
      </p>

      <ul className="-mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <li key={member.id}>
            <Link
              href={`/painel/membros/${member.id}`}
              className="panel-card block transition hover:border-purple/40"
            >
              <p className="font-semibold">{member.full_name?.trim() || "Sem nome"}</p>
              <p className="mt-1 text-sm text-muted">
                {member.email?.trim() || "Sem e-mail"}
                {member.cpf ? ` · CPF ${formatCpf(member.cpf)}` : ""}
              </p>
            </Link>
          </li>
        ))}
        {!members.length ? (
          <p className="text-sm text-muted">Nenhum membro com envio registrado ainda.</p>
        ) : null}
      </ul>
    </PainelPage>
  );
}
