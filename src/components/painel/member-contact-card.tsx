import Link from "next/link";
import { WhatsAppNotifyButton } from "@/components/painel/whatsapp-notify-button";
import { formatCpf } from "@/lib/cpf";
import type { StaffMemberContact } from "@/lib/members/staff-member-profile";

type MemberContactCardProps = {
  member: StaffMemberContact;
  compact?: boolean;
  whatsappMessage?: string;
};

function formatBirthDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

export function MemberContactCard({
  member,
  compact = false,
  whatsappMessage,
}: MemberContactCardProps) {
  const name = member.full_name?.trim() || "Sem nome";
  const email = member.email?.trim() || null;

  return (
    <section className="panel-card text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Contato do aluno</h2>
          {!compact ? (
            <p className="mt-1 text-muted">
              Use estes dados se precisar avisar o membro sobre o envio ou a correção.
            </p>
          ) : null}
        </div>
        {compact ? (
          <Link
            href={`/painel/membros/${member.id}`}
            className="text-sm font-medium text-purple hover:underline"
          >
            Ver ficha do membro
          </Link>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-muted">Nome</dt>
          <dd className="font-medium">{name}</dd>
        </div>
        <div>
          <dt className="text-muted">E-mail</dt>
          <dd className="font-medium">
            {email ? (
              <a href={`mailto:${email}`} className="text-purple hover:underline">
                {email}
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
        {!compact ? (
          <>
            <div>
              <dt className="text-muted">CPF</dt>
              <dd className="font-medium">
                {member.cpf ? formatCpf(member.cpf) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Data de nascimento</dt>
              <dd className="font-medium">{formatBirthDate(member.birth_date)}</dd>
            </div>
            <div>
              <dt className="text-muted">WhatsApp</dt>
              <dd className="font-medium">{member.whatsapp?.trim() || "—"}</dd>
            </div>
          </>
        ) : null}
      </dl>

      {whatsappMessage && member.whatsapp ? (
        <div className="mt-4">
          <WhatsAppNotifyButton phone={member.whatsapp} message={whatsappMessage} />
        </div>
      ) : null}
    </section>
  );
}
