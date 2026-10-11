import { escapeHtml } from "@/lib/email/escape-html";
import { sendEmail, type SendResult } from "@/lib/email/resend";
import { formatTicketProtocol } from "@/lib/support/protocol";

type SendSupportReplyEmailInput = {
  to: string;
  fullName: string;
  ticketTitle: string;
  ticketId: string;
  replyPreview: string;
  ticketUrl: string;
};

function primaryButton(href: string, label: string) {
  return `<p><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 18px;background:#8e3ebe;color:#fff;text-decoration:none;border-radius:10px">${escapeHtml(label)}</a></p>`;
}

export async function sendSupportReplyEmail(
  input: SendSupportReplyEmailInput,
): Promise<SendResult> {
  const greeting = input.fullName.trim() || "Olá";
  const protocol = formatTicketProtocol(input.ticketId);
  const preview =
    input.replyPreview.length > 280
      ? `${input.replyPreview.slice(0, 277)}...`
      : input.replyPreview;

  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px">
      <p>${escapeHtml(greeting)},</p>
      <p>Respondemos seu chamado <strong>${escapeHtml(input.ticketTitle)}</strong> (protocolo <strong>${protocol}</strong>).</p>
      <p style="padding:12px;background:#f4f4f5;border-radius:8px;color:#333">${escapeHtml(preview)}</p>
      ${primaryButton(input.ticketUrl, "Ver resposta completa")}
      <p style="color:#666;font-size:13px">Se o problema já foi resolvido, você pode encerrar o chamado no painel.</p>
    </div>`;

  return sendEmail({
    to: input.to,
    subject: `Resposta ao seu chamado — protocolo ${protocol}`,
    html,
  });
}
