import { redirect } from "next/navigation";
import { EnrollMemberForm } from "@/components/editais/enroll-member-form";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditalDetailPage({ params }: PageProps<"/painel/admin/editais/[id]">) {
  const { id } = await params;
  const { profile } = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/painel");

  const supabase = await createClient();
  const { data: edital } = await supabase
    .from("editais")
    .select("id, title")
    .eq("id", id)
    .maybeSingle();

  if (!edital) redirect("/painel/admin/editais");

  const { data: cargos } = await supabase
    .from("edital_cargos")
    .select("id, name, vacancy_count, sort_order")
    .eq("edital_id", id)
    .order("sort_order");

  const cargoIds = (cargos ?? []).map((cargo) => cargo.id);
  const { data: phases } = cargoIds.length
    ? await supabase
        .from("edital_phases")
        .select("id, cargo_id, phase_number, title, description, deadline_at")
        .in("cargo_id", cargoIds)
        .order("phase_number")
    : { data: [] };

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "membro")
    .order("full_name");

  const { data: enrollments } = await supabase
    .from("member_edital_enrollments")
    .select("id, member_id, cargo_id, profiles(full_name, email), edital_cargos(name)")
    .eq("edital_id", id);

  return (
    <section className="flex flex-col gap-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{edital.title}</h1>
        <p className="mt-2 text-muted">Cargos, fases e membros vinculados.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="flex flex-col gap-4">
          <h2 className="panel-title">Estrutura</h2>
          {(cargos ?? []).map((cargo) => (
            <article key={cargo.id} className="panel-card">
              <p className="font-semibold">{cargo.name}</p>
              <p className="text-sm text-muted">Vagas: {cargo.vacancy_count}</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {(phases ?? [])
                  .filter((phase) => phase.cargo_id === cargo.id)
                  .map((phase) => (
                    <li key={phase.id} className="rounded-xl border border-white/8 p-3">
                      <p className="font-medium">
                        Fase {phase.phase_number}: {phase.title}
                      </p>
                      <p className="mt-1 text-muted">{phase.description}</p>
                      <p className="mt-2 text-xs text-muted">
                        Prazo: {new Date(phase.deadline_at).toLocaleString("pt-BR")}
                      </p>
                    </li>
                  ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="panel-card h-fit">
          <h2 className="panel-title">Vincular membro</h2>
          <div className="mt-4">
            <EnrollMemberForm
              editalId={id}
              members={members ?? []}
              cargos={(cargos ?? []).map((cargo) => ({ id: cargo.id, name: cargo.name }))}
            />
          </div>
        </section>
      </div>

      <section>
        <h2 className="panel-title">Membros inscritos</h2>
        <div className="mt-4 flex flex-col gap-2">
          {(enrollments ?? []).map((row) => {
            const member = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
            const cargo = Array.isArray(row.edital_cargos)
              ? row.edital_cargos[0]
              : row.edital_cargos;
            return (
              <p key={row.id} className="text-sm">
                {member?.full_name ?? "—"} · {cargo?.name ?? "—"} ({member?.email ?? "—"})
              </p>
            );
          })}
          {!enrollments?.length ? (
            <p className="text-sm text-muted">Nenhum membro vinculado.</p>
          ) : null}
        </div>
      </section>
    </section>
  );
}
