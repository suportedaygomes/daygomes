import { redirect } from "next/navigation";
import { AdminUsersTable } from "@/components/painel/admin-users-table";
import type { AdminUserRow } from "@/components/painel/admin-users-table.types";
import { CreateUserForm } from "@/components/painel/create-user-form";
import { PainelPage } from "@/components/painel/painel-page";
import { getCurrentProfile } from "@/lib/auth/profile";
import type { UserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  const { user, profile } = await getCurrentProfile();

  if (!user || !profile || profile.role !== "admin") {
    redirect("/painel");
  }

  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, cpf, role, created_at")
    .order("created_at", { ascending: false });

  const rows: AdminUserRow[] = (users ?? []).map((row) => ({
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    cpf: row.cpf,
    role: row.role as UserRole,
  }));

  return (
    <PainelPage gap="lg" className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:gap-10">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Usuários</h1>
        <p className="mt-2 text-muted">
          Cadastre membros, corretores ou administradores. A exclusão remove o login e os dados
          vinculados do membro na plataforma.
        </p>

        <div className="mt-6">
          <AdminUsersTable users={rows} currentAdminId={user.id} />
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
