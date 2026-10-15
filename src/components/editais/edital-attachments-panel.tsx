import {
  type EditalAttachmentView,
  editalAttachmentDownloadPath,
  formatAttachmentSize,
} from "@/lib/editais/attachments-shared";

type EditalAttachmentsPanelProps = {
  editalId: string;
  attachments: EditalAttachmentView[];
  title?: string;
};

export function EditalAttachmentsPanel({
  editalId,
  attachments,
  title = "Materiais do edital",
}: EditalAttachmentsPanelProps) {
  if (!attachments.length) {
    return null;
  }

  return (
    <section className="panel-card flex flex-col gap-4">
      <h2 className="panel-title">{title}</h2>
      <ul className="flex flex-col gap-3">
        {attachments.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-2 rounded-xl border border-white/10 bg-field/50 p-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-semibold">{item.title}</p>
              {item.description ? (
                <p className="mt-1 text-sm leading-6 text-muted">{item.description}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted">
                {item.originalFilename} · {formatAttachmentSize(item.fileSize)}
              </p>
            </div>
            <a
              href={editalAttachmentDownloadPath(editalId, item.id)}
              className="btn-secondary btn-sm shrink-0 w-fit"
            >
              Baixar
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
