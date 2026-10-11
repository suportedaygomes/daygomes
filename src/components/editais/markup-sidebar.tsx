import Link from "next/link";
import {
  MARKUP_COLORS,
  type MarkupAnnotation,
  type MarkupColorId,
  markupColorRgba,
} from "@/lib/markup/types";

type MarkupSidebarProps = {
  annotations: MarkupAnnotation[];
  activeId: string | null;
  loaded: boolean;
  color: MarkupColorId;
  pending: boolean;
  error: string;
  message: string;
  onColorChange: (color: MarkupColorId) => void;
  onSave: () => void;
  onNoteChange: (id: string, note: string) => void;
  onRemove: (id: string) => void;
  onFocus: (id: string) => void;
  correctionHref: string;
};

export function MarkupToolbar({
  color,
  pending,
  onColorChange,
  onSave,
}: Pick<MarkupSidebarProps, "color" | "pending" | "onColorChange" | "onSave">) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {MARKUP_COLORS.map((item) => (
        <button
          key={item.id}
          type="button"
          title={item.label}
          onClick={() => onColorChange(item.id)}
          className={`h-9 rounded-xl border px-3 text-xs font-medium transition ${
            color === item.id ? "border-purple bg-purple/20" : "border-white/15 bg-field"
          }`}
        >
          <span
            className="mr-2 inline-block h-3 w-3 rounded-sm align-middle"
            style={{ backgroundColor: item.rgba }}
          />
          {item.label}
        </button>
      ))}
      <button type="button" className="btn-primary" disabled={pending} onClick={onSave}>
        {pending ? "Salvando..." : "Salvar marcações"}
      </button>
    </div>
  );
}

export function MarkupSidebar({
  annotations,
  activeId,
  loaded,
  error,
  message,
  onNoteChange,
  onRemove,
  onFocus,
  correctionHref,
}: MarkupSidebarProps) {
  return (
    <aside className="panel-card flex max-h-[70vh] flex-col gap-3 overflow-hidden lg:max-h-[calc(100dvh-8rem)]">
      <h2 className="text-lg font-semibold">Apontamentos</h2>
      {!loaded ? <p className="text-sm text-muted">Carregando...</p> : null}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {annotations.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma marcação ainda.</p>
        ) : (
          annotations.map((item, index) => (
            <div
              key={item.id}
              className={`rounded-xl border p-3 ${
                activeId === item.id ? "border-purple/50 bg-purple/10" : "border-white/10"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Marcação {index + 1}
                  {item.page > 1 ? ` · pág. ${item.page}` : ""}
                </p>
                <button
                  type="button"
                  className="text-xs text-red-300 hover:underline"
                  onClick={() => onRemove(item.id)}
                >
                  Remover
                </button>
              </div>
              <span
                className="mt-2 inline-block h-3 w-8 rounded-sm"
                style={{ backgroundColor: markupColorRgba(item.color) }}
              />
              <label className="mt-3 flex flex-col gap-1 text-sm">
                Por que grifou aqui?
                <textarea
                  className="field-input min-h-20 resize-y py-2 text-sm"
                  value={item.note}
                  placeholder="Ex.: A palavra correta é assessor, não acessor."
                  onFocus={() => onFocus(item.id)}
                  onChange={(event) => onNoteChange(item.id, event.target.value)}
                />
              </label>
            </div>
          ))
        )}
      </div>
      {error ? <p role="alert" className="alert-error">{error}</p> : null}
      {message ? (
        <p role="status" className="alert-success">
          {message}
        </p>
      ) : null}

      <Link href={correctionHref} className="btn-secondary mt-1 text-center">
        Voltar para correção
      </Link>
      <p className="text-xs text-muted">
        Na correção você informa a nota e salva o feedback final do aluno.
      </p>
    </aside>
  );
}
