"use client";

import { FormEvent, useEffect, useState } from "react";
import { saveKiwifyProductMapping } from "@/app/actions/kiwify-mappings";
import {
  CorrectionQuotaSelect,
  formatEditalDefaultCorrectionQuota,
} from "@/components/editais/correction-quota-select";
import { normalizeCorrectionQuota } from "@/lib/editais/enrollment-quota";

type EditalOption = {
  id: string;
  title: string;
  defaultCorrectionQuota: number;
};

type KiwifyMappingFormProps = {
  editais: EditalOption[];
};

export function KiwifyMappingForm({ editais }: KiwifyMappingFormProps) {
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [editalId, setEditalId] = useState(editais[0]?.id ?? "");
  const [correctionQuota, setCorrectionQuota] = useState(
    editais[0] ? normalizeCorrectionQuota(editais[0].defaultCorrectionQuota) : 4,
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const edital = editais.find((item) => item.id === editalId);
    if (edital) {
      setCorrectionQuota(normalizeCorrectionQuota(edital.defaultCorrectionQuota));
    }
  }, [editalId, editais]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);

    const result = await saveKiwifyProductMapping({
      kiwifyProductId: productId,
      kiwifyProductName: productName,
      editalId,
      correctionQuota,
    });

    if (!result.ok) {
      setError(result.message);
    } else {
      setMessage(result.message);
      setProductId("");
      setProductName("");
    }

    setPending(false);
  }

  if (!editais.length) {
    return (
      <p className="text-sm text-muted">Cadastre um edital antes de mapear produtos da Kiwify.</p>
    );
  }

  const selectedEdital = editais.find((item) => item.id === editalId);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium">
        ID do produto (Kiwify)
        <input
          className="field-input"
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
          placeholder="93081353-4bc9-4227-adca-77e22636a240"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Nome do produto (opcional)
        <input
          className="field-input"
          value={productName}
          onChange={(event) => setProductName(event.target.value)}
          placeholder="Mentoria 3 correções"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Mentoria (edital) liberada
        <select
          className="field-input"
          value={editalId}
          onChange={(event) => setEditalId(event.target.value)}
        >
          {editais.map((edital) => (
            <option key={edital.id} value={edital.id}>{edital.title}</option>
          ))}
        </select>
      </label>
      {selectedEdital ? (
        <p className="text-xs text-muted">
          Padrão cadastrado nesta mentoria:{" "}
          <strong className="text-foreground">
            {formatEditalDefaultCorrectionQuota(selectedEdital.defaultCorrectionQuota)}
          </strong>
          . Ajuste abaixo se este produto for pacote avulso (ex.: +4 correções no Zero à Prova).
        </p>
      ) : null}
      <CorrectionQuotaSelect
        variant="kiwify-product"
        value={correctionQuota}
        onChange={setCorrectionQuota}
        id="kiwify-mapping-quota"
      />
      {error ? <p className="alert-error">{error}</p> : null}
      {message ? <p className="alert-success">{message}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary w-fit">
        {pending ? "Salvando..." : "Salvar mapeamento"}
      </button>
    </form>
  );
}
