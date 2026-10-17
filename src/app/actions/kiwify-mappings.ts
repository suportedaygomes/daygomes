"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { normalizeCorrectionQuota } from "@/lib/editais/enrollment-quota";
import { createClient } from "@/lib/supabase/server";

export async function saveKiwifyProductMapping(input: {
  kiwifyProductId: string;
  kiwifyProductName: string;
  editalId: string;
  correctionQuota: number;
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
  const { data: edital } = await supabase
    .from("editais")
    .select("id")
    .eq("id", input.editalId)
    .maybeSingle();

  if (!edital) {
    return { ok: false, message: "Edital inválido." };
  }

  const correctionQuota = normalizeCorrectionQuota(input.correctionQuota);

  const { error } = await supabase.from("kiwify_product_mappings").upsert(
    {
      kiwify_product_id: kiwifyProductId,
      kiwify_product_name: kiwifyProductName || null,
      edital_id: input.editalId,
      cargo_id: null,
      correction_quota: correctionQuota,
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
