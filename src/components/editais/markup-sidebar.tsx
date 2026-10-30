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
  error: string;
  message: string;
  onNoteChange: (id: string, note: string) => void;
  onRemove: (id: string) => void;
  onFocus: (id: string) => void;
  correctionHref: string;
};

type MarkupToolbarProps = {
  color: MarkupColorId;
  pending: boolean;
  onColorChange: (color: MarkupColorId) => void;
  onSave: () => void;
  layout?: "default" | "strip";
};

export function MarkupToolbar({
  color,
  pending,
  onColorChange,
  onSave,
  layout = "default",
}: MarkupToolbarProps) {
  const colorButtons = MARKUP_COLORS.map((item) => (
    <button
      key={item.id}
      type="button"
      title={item.label}
      onClick={() => onColorChange(item.id)}
      className={`rounded-xl border text-xs font-medium transition ${
        layout === "strip" ? "h-10 shrink-0 px-2.5 sm:px-3" : "h-9 px-3"
      } ${
        color === item.id ? "border-purple bg-purple/20" : "border-white/15 bg-field"
      }`}
    >
      <span
        className={`inline-block rounded-sm align-middle ${
          layout === "strip" ? "mr-1.5 h-3.5 w-3.5" : "mr-2 h-3 w-3"
        }`}
        style={{ backgroundColor: item.rgba }}
      />
      <span className={layout === "strip" ? "hidden sm:inline" : ""}>{item.label}</span>
    </button>
  ));

  const saveButton = (
    <button
      type="button"
      className={`btn-primary shrink-0 ${layout === "strip" ? "h-10 px-4 text-xs" : ""}`}
      disabled={pending}
      onClick={onSave}
    >
      {pending ? "Salvando..." : "Salvar marcações"}
    </button>
  );

  if (layout === "strip") {
    return (
      <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-elevated)] px-3 py-2.5">
        <p className="mr-1 hidden text-xs font-medium text-muted lg:block">Cor</p>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:gap-2">
          {colorButtons}
        </div>
        {saveButton}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {colorButtons}
      {saveButton}
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
    <aside className="flex flex-col px-3 pb-4 pt-2 lg:px-4 lg:pt-3">
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold lg:text-lg">Apontamentos</h2>
        {!loaded ? <span className="text-xs text-muted">Carregando…</span> : null}
      </div>
      <p className="mt-1 shrink-0 text-xs text-muted">
        Descreva cada grifo. Role a página para ver a redação inteira.
      </p>

      <div className="mt-3 space-y-4 pr-0.5">
        {annotations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[color:var(--border-subtle)] bg-field/40 px-3 py-6 text-center text-sm text-muted">
            Nenhuma marcação ainda. Escolha a cor, arraste na redação e escreva aqui o motivo.
          </p>
        ) : (
          annotations.map((item, index) => (
            <div
              key={item.id}
              className={`rounded-xl border p-3 lg:p-4 ${
                activeId === item.id
                  ? "border-purple/50 bg-purple/10 ring-1 ring-purple/20"
                  : "border-[color:var(--border-subtle)] bg-[color:var(--surface-elevated)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Marcação {index + 1}
                  {item.page > 1 ? ` · pág. ${item.page}` : ""}
                </p>
                <button
                  type="button"
                  className="text-xs text-red-400 hover:underline"
                  onClick={() => onRemove(item.id)}
                >
                  Remover
                </button>
              </div>
              <span
                className="mt-2 inline-block h-3 w-10 rounded-sm"
                style={{ backgroundColor: markupColorRgba(item.color) }}
              />
              <label className="mt-3 flex flex-col gap-1.5 text-sm font-medium">
                Por que grifou aqui?
                <textarea
                  className="field-input min-h-[7.5rem] resize-y py-2.5 text-sm leading-relaxed lg:min-h-[8.5rem]"
                  rows={5}
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

      <div className="mt-3 shrink-0 space-y-2 border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-elevated)]/80 pt-3">
        {error ? (
          <p role="alert" className="alert-error">
            {error}
          </p>
        ) : null}
        {message ? (
          <p role="status" className="alert-success">
            {message}
          </p>
        ) : null}

        <Link href={correctionHref} className="btn-secondary w-full text-center text-sm">
          Voltar para correção
        </Link>
      </div>
    </aside>
  );
}
