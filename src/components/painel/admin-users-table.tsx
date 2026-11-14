"use client";

import type { AdminUserRow } from "@/components/painel/admin-users-table.types";
import { DeletePlatformUserButton } from "@/components/painel/delete-platform-user-button";
import { formatCpf } from "@/lib/cpf";
import { ROLE_LABELS } from "@/lib/roles";

export type { AdminUserRow };

type Props = {
  users: AdminUserRow[];
  currentAdminId: string;
};

export function AdminUsersTable({ users, currentAdminId }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.04] text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Nome</th>
            <th className="px-4 py-3 font-medium">E-mail</th>
            <th className="hidden px-4 py-3 font-medium sm:table-cell">CPF</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium w-28">Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map((row) => (
            <tr key={row.id} className="border-t border-white/8">
              <td className="px-4 py-3 font-medium">{row.full_name || "—"}</td>
              <td className="px-4 py-3 text-muted">{row.email || "—"}</td>
              <td className="hidden px-4 py-3 text-muted sm:table-cell">
                {row.cpf ? formatCpf(row.cpf) : "—"}
              </td>
              <td className="px-4 py-3">{ROLE_LABELS[row.role]}</td>
              <td className="px-4 py-3">
                <DeletePlatformUserButton
                  userId={row.id}
                  displayName={row.full_name?.trim() || row.email || "Usuário"}
                  currentAdminId={currentAdminId}
                  compact
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!users.length ? (
        <p className="px-4 py-6 text-sm text-muted">Nenhum usuário cadastrado ainda.</p>
      ) : null}
    </div>
  );
}