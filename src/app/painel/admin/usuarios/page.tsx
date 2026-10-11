import { redirect } from "next/navigation";
import { CreateUserForm } from "@/components/painel/create-user-form";
import { PainelPage } from "@/components/painel/painel-page";
import { formatCpf } from "@/lib/cpf";
import { getCurrentProfile } from "@/lib/auth/profile";
import { ROLE_LABELS, type UserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  const { profile } = await getCurrentProfile();

  if (!profile || profile.role !== "admin") {
    redirect("/painel");
  }

  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, cpf, role, created_at")
    .order("created_at", { ascending: false });

  return (
    <PainelPage gap="lg" className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:gap-10">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Usuários</h1>
        <p className="mt-2 text-muted">
          Cadastre membros, corretores ou outros administradores.
        </p>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">CPF</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((row) => (
                <tr key={row.id} className="border-t border-white/8">
                  <td className="px-4 py-3 font-medium">{row.full_name || "—"}</td>
                  <td className="px-4 py-3 text-muted">{row.email || "—"}</td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">
                    {row.cpf ? formatCpf(row.cpf) : "—"}
                  </td>
                  <td className="px-4 py-3">{ROLE_LABELS[row.role as UserRole]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users?.length ? (
            <p className="px-4 py-6 text-sm text-muted">Nenhum usuário cadastrado ainda.</p>
          ) : null}
        </div>
      </section>

      <section className="panel-card h-fit">
        <h2 className="panel-title">Novo usuário</h2>
        <div className="mt-4">
          <CreateUserForm />
        </div>
      </section>
    </PainelPage>
  );
}
