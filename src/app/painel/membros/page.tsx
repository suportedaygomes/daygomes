import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PainelPage } from "@/components/painel/painel-page";
import { formatCpf } from "@/lib/cpf";
import { getCurrentProfile } from "@/lib/auth/profile";
import { listStaffMemberDirectory } from "@/lib/members/staff-member-directory";
import { isStaffRole } from "@/lib/members/staff-member-profile";

export const dynamic = "force-dynamic";

function formatWhatsApp(value: string | null) {
  const digits = (value ?? "").replace(/\D/g, "");
  if (!digits) return "—";
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value;
}

export default async function StaffMembrosPage() {
  const { profile } = await getCurrentProfile();
  if (!profile || !isStaffRole(profile.role)) {
    redirect("/painel");
  }

  const members = await listStaffMemberDirectory(profile);

  return (
    <PainelPage gap="lg">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Membros</h1>
        <p className="mt-2 text-muted">
          Todos os alunos com acesso à plataforma. Contato, editais vinculados e envio de atividades.
        </p>
        <p className="mt-1 text-sm text-muted">
          Total: <strong className="text-foreground">{members.length}</strong> membro
          {members.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="bg-white/[0.04] text-muted">
            <tr>
              <th className="px-3 py-3 font-medium">Membro</th>
              <th className="hidden px-3 py-3 font-medium md:table-cell">E-mail</th>
              <th className="hidden px-3 py-3 font-medium lg:table-cell">CPF</th>
              <th className="hidden px-3 py-3 font-medium xl:table-cell">Telefone</th>
              <th className="px-3 py-3 font-medium text-center">Editais</th>
              <th className="px-3 py-3 font-medium text-center">Enviadas</th>
              <th className="px-3 py-3 font-medium text-center">Faltam</th>
              <th className="px-3 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-t border-white/8">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    {member.avatarUrl ? (
                      <Image
                        src={member.avatarUrl}
                        alt=""
                        width={40}
                        height={40}
                        className="size-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-purple/25 text-sm font-semibold text-purple"
                        aria-hidden
                      >
                        {(member.full_name?.trim() || member.email || "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {member.full_name?.trim() || "Sem nome"}
                      </p>
                      <p className="text-xs text-muted truncate md:hidden">
                        {member.email?.trim() || "—"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="hidden px-3 py-3 text-muted md:table-cell">
                  {member.email?.trim() || "—"}
                </td>
                <td className="hidden px-3 py-3 text-muted lg:table-cell">
                  {member.cpf ? formatCpf(member.cpf) : "—"}
                </td>
                <td className="hidden px-3 py-3 text-muted xl:table-cell">
                  {formatWhatsApp(member.whatsapp)}
                </td>
                <td className="px-3 py-3 text-center tabular-nums">{member.editalCount}</td>
                <td className="px-3 py-3 text-center tabular-nums">{member.activitiesSent}</td>
                <td className="px-3 py-3 text-center tabular-nums">{member.themesRemaining}</td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={`/painel/membros/${member.id}`}
                    className="text-sm font-medium text-purple hover:underline"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!members.length ? (
          <p className="px-4 py-8 text-sm text-muted">Nenhum membro cadastrado ainda.</p>
        ) : null}
      </div>
      {members.length > 0 ? (
        <p className="text-xs text-muted">
          <strong>Enviadas:</strong> quantidade de envios registrados.{" "}
          <strong>Faltam:</strong> temas do edital sem nenhum envio ainda (soma dos editais
          vinculados).
        </p>
      ) : null}
    </PainelPage>
  );
}
