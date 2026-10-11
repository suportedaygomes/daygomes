import { Resend } from "resend";

export type EmailAttachment = {
  filename: string;
  content: Buffer;
};

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
};

export type SendResult = { ok: true; id?: string } | { ok: false; error: string };

function getFromAddress() {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    "Day Gomes <acesso@daygomes.com.br>"
  );
}

function getReplyTo() {
  return process.env.EMAIL_REPLY_TO?.trim() || "acesso@daygomes.com.br";
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY não configurada." };
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      replyTo: input.replyTo ?? getReplyTo(),
      attachments: input.attachments?.map((item) => ({
        filename: item.filename,
        content: item.content,
      })),
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao enviar e-mail.";
    return { ok: false, error: message };
  }
}
