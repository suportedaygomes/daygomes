"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { normalizeKiwifyMappingQuota } from "@/lib/editais/enrollment-quota";
import {
  reprocessKiwifyOrderById,
  reprocessUnlinkedKiwifyOrders,
} from "@/lib/kiwify/reprocess-order";
import { retryKiwifyAccessEmail } from "@/lib/kiwify/retry-access-email";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const { profile } = await getCurrentProfile();
  if (!profile || profile.role !== "admin" || profile.banned) {
    return { ok: false as const, message: "Acesso negado." };
  }
  return { ok: true as const, profile };
}

export async function saveKiwifyProductMapping(input: {
  kiwifyProductId: string;
  kiwifyProductName: string;
  editalId: string;
  correctionQuota: number;
}) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

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

  const correctionQuota = normalizeKiwifyMappingQuota(input.correctionQuota);

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

export async function updateKiwifyProductMapping(input: {
  previousKiwifyProductId: string;
  kiwifyProductId: string;
  kiwifyProductName: string;
  editalId: string;
  correctionQuota: number;
  isActive: boolean;
}) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const previousId = input.previousKiwifyProductId.trim();
  const kiwifyProductId = input.kiwifyProductId.trim();
  const kiwifyProductName = input.kiwifyProductName.trim();

  if (!previousId || !kiwifyProductId) {
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

  const correctionQuota = normalizeKiwifyMappingQuota(input.correctionQuota);

  const row = {
    kiwify_product_id: kiwifyProductId,
    kiwify_product_name: kiwifyProductName || null,
    edital_id: input.editalId,
    cargo_id: null,
    correction_quota: correctionQuota,
    is_active: input.isActive,
    updated_at: new Date().toISOString(),
  };

  if (previousId !== kiwifyProductId) {
    const { data: existing } = await supabase
      .from("kiwify_product_mappings")
      .select("kiwify_product_id")
      .eq("kiwify_product_id", kiwifyProductId)
      .maybeSingle();

    if (existing) {
      return { ok: false, message: "Já existe mapeamento com esse ID de produto." };
    }

    const { error: insertError } = await supabase.from("kiwify_product_mappings").insert(row);
    if (insertError) {
      return { ok: false, message: "Não foi possível atualizar o mapeamento." };
    }

    const { error: deleteError } = await supabase
      .from("kiwify_product_mappings")
      .delete()
      .eq("kiwify_product_id", previousId);

    if (deleteError) {
      return { ok: false, message: "Novo ID salvo, mas não foi possível remover o antigo." };
    }
  } else {
    const { error } = await supabase
      .from("kiwify_product_mappings")
      .update(row)
      .eq("kiwify_product_id", previousId);

    if (error) {
      return { ok: false, message: "Não foi possível atualizar o mapeamento." };
    }
  }

  revalidatePath("/painel/admin/kiwify");
  return { ok: true, message: "Mapeamento atualizado." };
}

export async function deleteKiwifyProductMapping(kiwifyProductId: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const id = kiwifyProductId.trim();
  if (!id) {
    return { ok: false, message: "ID do produto inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("kiwify_product_mappings").delete().eq("kiwify_product_id", id);

  if (error) {
    return { ok: false, message: "Não foi possível excluir o mapeamento." };
  }

  revalidatePath("/painel/admin/kiwify");
  return { ok: true, message: "Mapeamento excluído." };
}

export async function reprocessKiwifyOrder(orderId: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const result = await reprocessKiwifyOrderById(orderId);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidatePath("/painel/admin/kiwify");
  return { ok: true, message: result.message };
}

export async function reprocessAllUnlinkedKiwifyOrders() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const result = await reprocessUnlinkedKiwifyOrders();
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidatePath("/painel/admin/kiwify");
  return { ok: true, message: result.message };
}

export async function resendKiwifyAccessEmail(orderId: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const result = await retryKiwifyAccessEmail(orderId);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidatePath("/painel/admin/kiwify");
  return { ok: true, message: result.message };
}
