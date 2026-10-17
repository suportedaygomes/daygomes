"use client";

import { FormEvent, useState } from "react";
import { saveKiwifyProductMapping } from "@/app/actions/kiwify-mappings";
import { MAX_CORRECTION_QUOTA, MIN_CORRECTION_QUOTA } from "@/lib/editais/enrollment-quota";

type EditalOption = {
  id: string;
  title: string;
};

type KiwifyMappingFormProps = {
  editais: EditalOption[];
};

export function KiwifyMappingForm({ editais }: KiwifyMappingFormProps) {
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [editalId, setEditalId] = useState(editais[0]?.id ?? "");
  const [correctionQuota, setCorrectionQuota] = useState(1);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

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
      <label className="flex flex-col gap-2 text-sm font-medium">
        Correções incluídas no plano
        <input
          type="number"
          min={MIN_CORRECTION_QUOTA}
          max={MAX_CORRECTION_QUOTA}
          className="field-input max-w-xs"
          value={correctionQuota}
          onChange={(event) => setCorrectionQuota(Number(event.target.value))}
          required
        />
      </label>
      <p className="text-xs text-muted">
        O aluno terá acesso a todos os cargos do edital e poderá usar até este número de envios (
        {MIN_CORRECTION_QUOTA}–{MAX_CORRECTION_QUOTA}).
      </p>
      {error ? <p className="alert-error">{error}</p> : null}
      {message ? <p className="alert-success">{message}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary w-fit">
        {pending ? "Salvando..." : "Salvar mapeamento"}
      </button>
    </form>
  );
}
