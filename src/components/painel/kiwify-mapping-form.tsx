"use client";

import { FormEvent, useMemo, useState } from "react";
import { saveKiwifyProductMapping } from "@/app/actions/kiwify-mappings";

type EditalOption = {
  id: string;
  title: string;
  cargos: Array<{ id: string; name: string }>;
};

type KiwifyMappingFormProps = {
  editais: EditalOption[];
};

export function KiwifyMappingForm({ editais }: KiwifyMappingFormProps) {
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [editalId, setEditalId] = useState(editais[0]?.id ?? "");
  const [cargoId, setCargoId] = useState(editais[0]?.cargos[0]?.id ?? "");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const cargos = useMemo(
    () => editais.find((item) => item.id === editalId)?.cargos ?? [],
    [editais, editalId],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);

    const result = await saveKiwifyProductMapping({
      kiwifyProductId: productId,
      kiwifyProductName: productName,
      editalId,
      cargoId,
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
      <p className="text-sm text-muted">
        Cadastre um edital com cargos antes de mapear produtos da Kiwify.
      </p>
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
          placeholder="Curso Redação ENEM"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Edital liberado
        <select
          className="field-input"
          value={editalId}
          onChange={(event) => {
            setEditalId(event.target.value);
            const firstCargo = editais.find((item) => item.id === event.target.value)?.cargos[0];
            setCargoId(firstCargo?.id ?? "");
          }}
        >
          {editais.map((edital) => (
            <option key={edital.id} value={edital.id}>{edital.title}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Cargo
        <select
          className="field-input"
          value={cargoId}
          onChange={(event) => setCargoId(event.target.value)}
        >
          {cargos.map((cargo) => (
            <option key={cargo.id} value={cargo.id}>{cargo.name}</option>
          ))}
        </select>
      </label>
      {error ? <p className="alert-error">{error}</p> : null}
      {message ? <p className="alert-success">{message}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary w-fit">
        {pending ? "Salvando..." : "Salvar mapeamento"}
      </button>
    </form>
  );
}
