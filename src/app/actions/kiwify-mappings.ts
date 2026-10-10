"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export async function saveKiwifyProductMapping(input: {
  kiwifyProductId: string;
  kiwifyProductName: string;
  editalId: string;
  cargoId: string;
}) {
  const { profile } = await getCurrentProfile();
  if (!profile || profile.role !== "admin" || profile.banned) {
    return { ok: false, message: "Acesso negado." };
  }

  const kiwifyProductId = input.kiwifyProductId.trim();
  const kiwifyProductName = input.kiwifyProductName.trim();

  if (!kiwifyProductId) {
    return { ok: false, message: "Informe o ID do produto na Kiwify." };
  }

  const supabase = await createClient();
  const { data: cargo } = await supabase
    .from("edital_cargos")
    .select("id, edital_id")
    .eq("id", input.cargoId)
    .eq("edital_id", input.editalId)
    .maybeSingle();

  if (!cargo) {
    return { ok: false, message: "Cargo inválido para o edital selecionado." };
  }

  const { error } = await supabase.from("kiwify_product_mappings").upsert(
    {
      kiwify_product_id: kiwifyProductId,
      kiwify_product_name: kiwifyProductName || null,
      edital_id: input.editalId,
      cargo_id: input.cargoId,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "kiwify_product_id" },
  );

  if (error) {
    return { ok: false, message: "Não foi possível salvar o mapeamento." };
  }

  revalidatePath("/painel/admin/kiwify");
  return { ok: true, message: "Mapeamento salvo." };
}
