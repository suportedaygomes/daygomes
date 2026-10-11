type SupportTicketThreadProps = {
  ticketId: string;
  createdAt: string;
  initialDescription: string;
  initialHasAttachment: boolean;
  replies: Array<{
    id: string;
    body: string;
    created_at: string;
    author_name: string | null;
    has_attachment: boolean;
  }>;
};

export function SupportTicketThread({
  ticketId,
  createdAt,
  initialDescription,
  initialHasAttachment,
  replies,
}: SupportTicketThreadProps) {
  return (
    <section className="panel-card flex flex-col gap-6">
      <h2 className="text-lg font-semibold">Conversa</h2>

      <article className="rounded-xl border border-white/10 bg-field/40 p-4">
        <p className="text-xs font-semibold text-muted">
          Aluno · {new Date(createdAt).toLocaleString("pt-BR")}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{initialDescription}</p>
        {initialHasAttachment ? (
          <img
            src={`/api/support/${ticketId}/attachment`}
            alt="Anexo inicial"
            className="mt-4 max-h-64 w-full rounded-lg border border-white/10 object-contain"
          />
        ) : null}
      </article>

      {replies.map((reply) => (
        <article
          key={reply.id}
          className="rounded-xl border border-purple/25 bg-purple/10 p-4"
        >
          <p className="text-xs font-semibold text-muted">
            Equipe ({reply.author_name?.trim() || "Corretor"}) ·{" "}
            {new Date(reply.created_at).toLocaleString("pt-BR")}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{reply.body}</p>
          {reply.has_attachment ? (
            <img
              src={`/api/support/replies/${reply.id}/attachment`}
              alt="Anexo da resposta"
              className="mt-4 max-h-64 w-full rounded-lg border border-white/10 object-contain"
            />
          ) : null}
        </article>
      ))}
    </section>
  );
}
