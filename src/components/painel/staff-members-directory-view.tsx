"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatCpf } from "@/lib/cpf";
import {
  EMPTY_STAFF_MEMBER_FILTERS,
  filterStaffMemberDirectory,
  type StaffMemberDirectoryFilters,
} from "@/lib/members/filter-staff-member-directory";
import type { StaffMemberDirectoryRow } from "@/lib/members/staff-member-directory";

type StaffMembersDirectoryViewProps = {
  members: StaffMemberDirectoryRow[];
};

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

function formatJoinedAt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function StaffMembersDirectoryView({ members }: StaffMembersDirectoryViewProps) {
  const [filters, setFilters] = useState<StaffMemberDirectoryFilters>(EMPTY_STAFF_MEMBER_FILTERS);

  const filtered = useMemo(
    () => filterStaffMemberDirectory(members, filters),
    [members, filters],
  );

  const hasActiveFilters = Object.values(filters).some((value) => value.trim().length > 0);

  function setField<K extends keyof StaffMemberDirectoryFilters>(key: K, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="panel-card flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-semibold">Buscar membros</h2>
          {hasActiveFilters ? (
            <button
              type="button"
              className="text-sm font-medium text-purple hover:underline"
              onClick={() => setFilters(EMPTY_STAFF_MEMBER_FILTERS)}
            >
              Limpar filtros
            </button>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Nome
            <input
              type="search"
              className="field-input"
              placeholder="Parte do nome"
              value={filters.name}
              onChange={(e) => setField("name", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            E-mail
            <input
              type="search"
              className="field-input"
              placeholder="exemplo@gmail.com"
              value={filters.email}
              onChange={(e) => setField("email", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            CPF
            <input
              type="search"
              className="field-input"
              placeholder="Somente números ou formatado"
              value={filters.cpf}
              onChange={(e) => setField("cpf", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Telefone
            <input
              type="search"
              className="field-input"
              placeholder="DDD + número"
              value={filters.phone}
              onChange={(e) => setField("phone", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Entrada a partir de
            <input
              type="date"
              className="field-input"
              value={filters.joinedFrom}
              onChange={(e) => setField("joinedFrom", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Entrada até
            <input
              type="date"
              className="field-input"
              value={filters.joinedTo}
              onChange={(e) => setField("joinedTo", e.target.value)}
            />
          </label>
        </div>
        <p className="text-sm text-muted">
          Exibindo <strong className="text-foreground">{filtered.length}</strong> de{" "}
          <strong className="text-foreground">{members.length}</strong> membros
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[62rem] text-left text-sm">
          <thead className="bg-white/[0.04] text-muted">
            <tr>
              <th className="px-3 py-3 font-medium">Membro</th>
              <th className="hidden px-3 py-3 font-medium md:table-cell">E-mail</th>
              <th className="hidden px-3 py-3 font-medium lg:table-cell">CPF</th>
              <th className="hidden px-3 py-3 font-medium xl:table-cell">Telefone</th>
              <th className="hidden px-3 py-3 font-medium sm:table-cell">Entrada</th>
              <th className="px-3 py-3 font-medium text-center">Editais</th>
              <th className="px-3 py-3 font-medium text-center">Correções usadas</th>
              <th className="px-3 py-3 font-medium text-center">Correções disponíveis</th>
              <th className="px-3 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((member) => (
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
                <td className="hidden px-3 py-3 text-muted sm:table-cell tabular-nums">
                  {formatJoinedAt(member.joinedAt)}
                </td>
                <td className="px-3 py-3 text-center tabular-nums">{member.editalCount}</td>
                <td className="px-3 py-3 text-center tabular-nums">{member.correctionsUsed}</td>
                <td className="px-3 py-3 text-center tabular-nums">
                  {member.correctionsRemaining}
                  {member.correctionsQuota > 0 ? (
                    <span className="text-xs text-muted"> / {member.correctionsQuota}</span>
                  ) : null}
                </td>
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
        ) : !filtered.length ? (
          <p className="px-4 py-8 text-sm text-muted">
            Nenhum membro corresponde aos filtros aplicados.
          </p>
        ) : null}
      </div>

      {members.length > 0 ? (
        <p className="text-xs text-muted">
          <strong>Entrada:</strong> data de criação da conta na plataforma.{" "}
          <strong>Correções:</strong> cota do plano por mentoria (0 a 4 no Zero à Prova, até 4 nas
          demais). Usadas = envios que consumiram cota; disponíveis = o que ainda pode enviar (soma
          de todas as mentorias).
        </p>
      ) : null}
    </div>
  );
}
