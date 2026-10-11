import { escapeHtml } from "@/lib/email/escape-html";
import { sendEmail, type SendResult } from "@/lib/email/resend";
import {
  buildTransactionalEmail,
  transactionalQuoteBlock,
} from "@/lib/email/transactional-layout";
import { formatTicketProtocol } from "@/lib/support/protocol";
import { extensionForImageMime } from "@/lib/support/validate";

/** Evita e-mail gigante; acima disso só anexo no Resend. */
const INLINE_IMAGE_MAX_BYTES = 600 * 1024;

type ReplyAttachment = {
  buffer: Buffer;
  mime: string;
};

type SendSupportReplyEmailInput = {
  to: string;
  fullName: string;
  ticketTitle: string;
  ticketId: string;
  replyBody: string;
  /** Chamado aberto por membro logado — link leva ao painel. */
  hasPortalAccess: boolean;
  /** Só usado quando o chamado foi aberto por membro logado. */
  ticketUrl?: string;
  attachment?: ReplyAttachment | null;
};

function replyAttachmentHtml(attachment: ReplyAttachment): string {
  const filename = `imagem-resposta.${extensionForImageMime(attachment.mime)}`;
  const note =
    `<p style="margin:16px 0 8px;font-size:14px;color:#b7b1aa;">A equipe enviou uma imagem com esta resposta (também em anexo: <strong style="color:#f6f3ef;">${escapeHtml(filename)}</strong>).</p>`;

  if (attachment.buffer.length > INLINE_IMAGE_MAX_BYTES) {
    return note;
  }

  const base64 = attachment.buffer.toString("base64");
  return `${note}
      <p style="margin:0 0 12px;">
        <img src="data:${attachment.mime};base64,${base64}" alt="Imagem enviada pela equipe Day Gomes" width="480" style="display:block;max-width:100%;height:auto;border-radius:10px;border:1px solid rgba(255,255,255,0.12);" />
      </p>`;
}

export async function sendSupportReplyEmail(
  input: SendSupportReplyEmailInput,
): Promise<SendResult> {
  const greeting = escapeHtml(input.fullName.trim() || "Olá");
  const protocol = formatTicketProtocol(input.ticketId);
  const quoteText =
    input.hasPortalAccess && input.replyBody.length > 280
      ? `${input.replyBody.slice(0, 277)}...`
      : input.replyBody;

  const introExtra = input.hasPortalAccess
    ? ""
    : `<p style="margin:0 0 12px;">Você abriu este chamado sem login na plataforma. A resposta da equipe está neste e-mail${input.attachment ? " e no anexo de imagem" : ""}.</p>`;

  const bodyHtml = `
      <p style="margin:0 0 12px;">${greeting},</p>
      <p style="margin:0 0 12px;">Respondemos seu chamado <strong style="color:#f6f3ef;">${escapeHtml(input.ticketTitle)}</strong> (protocolo <strong style="color:#f6f3ef;">${escapeHtml(protocol)}</strong>).</p>
      ${introExtra}
      ${transactionalQuoteBlock(quoteText)}
      ${input.attachment ? replyAttachmentHtml(input.attachment) : ""}`;

  const attachments = input.attachment
    ? [
        {
          filename: `imagem-resposta.${extensionForImageMime(input.attachment.mime)}`,
          content: input.attachment.buffer,
        },
      ]
    : undefined;

  const portalButton =
    input.hasPortalAccess && input.ticketUrl
      ? { href: input.ticketUrl, label: "Abrir chamado no painel" }
      : undefined;

  const html = buildTransactionalEmail({
    eyebrow: "Suporte",
    title: "Nova resposta no seu chamado",
    bodyHtml,
    button: portalButton,
    footerNote: input.hasPortalAccess
      ? "Se o problema já foi resolvido, você pode encerrar o chamado no painel."
      : "Precisa de mais ajuda? Responda este e-mail ou envie um novo pedido em daygomes.com.br/suporte.",
  });

  return sendEmail({
    to: input.to,
    subject: `Resposta ao seu chamado — protocolo ${protocol}`,
    html,
    attachments,
  });
}
