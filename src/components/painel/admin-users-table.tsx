"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteUserAsAdmin } from "@/app/actions/admin-users";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCpf } from "@/lib/cpf";
import { ROLE_LABELS, type UserRole } from "@/lib/roles";

export type AdminUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  cpf: string | null;
  role: UserRole;
};

type Props = {
  users: AdminUserRow[];
  currentAdminId: string;
};

export function AdminUsersTable({ users, currentAdminId }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirmUser, setConfirmUser] = useState<AdminUserRow | null>(null);

  async function onConfirmDelete() {
    if (!confirmUser) return;
    setConfirmUser(null);
    setError("");
    setPendingId(confirmUser.id);

    const result = await deleteUserAsAdmin(confirmUser.id);
    setPendingId(null);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.refresh();
  }

  return (
    <>
      {error ? <p className="alert-error mb-4 text-sm">{error}</p> : null}
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
            {users.map((row) => {
              const isSelf = row.id === currentAdminId;
              const pending = pendingId === row.id;
              return (
                <tr key={row.id} className="border-t border-white/8">
                  <td className="px-4 py-3 font-medium">{row.full_name || "—"}</td>
                  <td className="px-4 py-3 text-muted">{row.email || "—"}</td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">
                    {row.cpf ? formatCpf(row.cpf) : "—"}
                  </td>
                  <td className="px-4 py-3">{ROLE_LABELS[row.role]}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-action-danger text-xs font-medium disabled:opacity-50"
                      disabled={isSelf || pending || pendingId !== null}
                      title={isSelf ? "Você não pode excluir sua própria conta aqui." : undefined}
                      onClick={() => setConfirmUser(row)}
                    >
                      {pending ? "Excluindo..." : "Excluir"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!users.length ? (
          <p className="px-4 py-6 text-sm text-muted">Nenhum usuário cadastrado ainda.</p>
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(confirmUser)}
        title="Excluir usuário permanentemente?"
        danger
        confirmLabel="Excluir para sempre"
        pending={pendingId !== null}
        description={
          confirmUser ? (
            <>
              <strong className="text-foreground">{confirmUser.full_name || confirmUser.email}</strong>{" "}
              perderá o login e o acesso à plataforma. Inscrições e envios deste membro serão
              removidos. Esta ação não pode ser desfeita.
            </>
          ) : (
            ""
          )
        }
        onConfirm={onConfirmDelete}
        onCancel={() => setConfirmUser(null)}
      />
    </>
  );
}