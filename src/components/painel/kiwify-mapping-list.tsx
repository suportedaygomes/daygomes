"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteKiwifyProductMapping,
  updateKiwifyProductMapping,
} from "@/app/actions/kiwify-mappings";
import {
  CorrectionQuotaSelect,
  formatEditalDefaultCorrectionQuota,
} from "@/components/editais/correction-quota-select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { normalizeCorrectionQuota } from "@/lib/editais/enrollment-quota";

type EditalOption = {
  id: string;
  title: string;
  defaultCorrectionQuota: number;
};

type MappingRow = {
  kiwify_product_id: string;
  kiwify_product_name: string | null;
  is_active: boolean;
  correction_quota: number;
  edital_id: string;
  editalTitle: string;
};

type KiwifyMappingListProps = {
  mappings: MappingRow[];
  editais: EditalOption[];
};

export function KiwifyMappingList({ mappings, editais }: KiwifyMappingListProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuota, setEditQuota] = useState(4);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const editing = mappings.find((row) => row.kiwify_product_id === editingId);

  useEffect(() => {
    if (editing) {
      setEditQuota(normalizeCorrectionQuota(editing.correction_quota));
    }
  }, [editing]);

  async function onConfirmDelete() {
    if (!deleteTargetId) return;
    const kiwifyProductId = deleteTargetId;
    setDeleteTargetId(null);
    setError("");
    setMessage("");
    setPendingId(kiwifyProductId);
    const result = await deleteKiwifyProductMapping(kiwifyProductId);
    setPendingId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage(result.message);
    router.refresh();
  }

  async function onEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    const form = new FormData(event.currentTarget);
    setError("");
    setMessage("");
    setPendingId(editing.kiwify_product_id);

    const result = await updateKiwifyProductMapping({
      previousKiwifyProductId: editing.kiwify_product_id,
      kiwifyProductId: String(form.get("productId") ?? "").trim(),
      kiwifyProductName: String(form.get("productName") ?? "").trim(),
      editalId: String(form.get("editalId") ?? ""),
      correctionQuota: editQuota,
      isActive: form.get("isActive") === "on",
    });

    setPendingId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(result.message);
    setEditingId(null);
    router.refresh();
  }

  if (!mappings.length) {
    return <p className="text-sm text-muted">Nenhum mapeamento cadastrado.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <p className="alert-error text-sm">{error}</p> : null}
      {message ? <p className="alert-success text-sm">{message}</p> : null}

      <ul className="flex flex-col gap-2 text-sm">
        {mappings.map((row) => (
          <li key={row.kiwify_product_id} className="rounded-xl border border-white/8 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{row.kiwify_product_name ?? row.kiwify_product_id}</p>
                <p className="text-muted">
                  {row.editalTitle} ·{" "}
                  {row.correction_quota === 0
                    ? "só acesso (0 correções)"
                    : `${row.correction_quota} correção(ões)`}
                  {!row.is_active ? " · inativo" : ""}
                </p>
                <p className="mt-1 font-mono text-xs text-muted">{row.kiwify_product_id}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  disabled={pendingId === row.kiwify_product_id}
                  onClick={() => setEditingId(row.kiwify_product_id)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-sm text-red-200"
                  disabled={pendingId === row.kiwify_product_id}
                  onClick={() => setDeleteTargetId(row.kiwify_product_id)}
                >
                  Excluir
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {editing ? (
        <form onSubmit={onEditSubmit} className="rounded-xl border border-purple/30 bg-purple/5 p-4">
          <h3 className="text-sm font-semibold">Editar mapeamento</h3>
          <div className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium">
              ID do produto (Kiwify)
              <input
                name="productId"
                className="field-input"
                defaultValue={editing.kiwify_product_id}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Nome do produto
              <input
                name="productName"
                className="field-input"
                defaultValue={editing.kiwify_product_name ?? ""}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Mentoria (edital)
              <select name="editalId" className="field-input" defaultValue={editing.edital_id}>
                {editais.map((edital) => (
                  <option key={edital.id} value={edital.id}>{edital.title}</option>
                ))}
              </select>
            </label>
            <CorrectionQuotaSelect
              variant="kiwify-product"
              value={editQuota}
              onChange={setEditQuota}
              id={`edit-quota-${editing.kiwify_product_id}`}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={editing.is_active} />
              Mapeamento ativo (compras liberam acesso)
            </label>
            <p className="text-xs text-muted">
              Padrão da mentoria:{" "}
              {formatEditalDefaultCorrectionQuota(
                editais.find((e) => e.id === editing.edital_id)?.defaultCorrectionQuota ?? 4,
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-primary btn-sm" disabled={Boolean(pendingId)}>
                Salvar alterações
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setEditingId(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      ) : null}

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="Excluir mapeamento?"
        description="Novas compras desse produto não liberarão acesso automaticamente."
        confirmLabel="Excluir"
        danger
        pending={deleteTargetId !== null && pendingId === deleteTargetId}
        onConfirm={onConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
