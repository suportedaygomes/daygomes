import { escapeHtml } from "@/lib/email/escape-html";
import { sendEmail, type SendResult } from "@/lib/email/resend";

type SendAccessEmailInput = {
  to: string;
  fullName: string;
  loginUrl: string;
  password?: string;
  productName?: string;
  source?: "kiwify" | "admin";
};

function primaryButton(href: string, label: string) {
  return `<p><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 18px;background:#8e3ebe;color:#fff;text-decoration:none;border-radius:10px">${escapeHtml(label)}</a></p>`;
}

function emailShell(body: string) {
  return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px">${body}</div>`;
}

export async function sendAccessEmail(input: SendAccessEmailInput): Promise<SendResult> {
  const isNewAccount = Boolean(input.password);
  const source = input.source ?? "kiwify";
  const greeting = input.fullName.trim() || "Olá";

  const subject = isNewAccount
    ? "Seu acesso ao Day Gomes foi liberado"
    : "Novo curso liberado no Day Gomes";

  const intro =
    source === "admin"
      ? "Sua conta na plataforma Day Gomes foi criada."
      : "Sua compra na Kiwify foi confirmada e o acesso à plataforma Day Gomes já está liberado.";

  const productLine = input.productName
    ? `<p>Curso/produto: <strong>${escapeHtml(input.productName)}</strong></p>`
    : "";

  const credentialsBlock = isNewAccount
    ? `<p><strong>E-mail:</strong> ${escapeHtml(input.to)}<br />
       <strong>Senha temporária:</strong> ${escapeHtml(input.password ?? "")}</p>
       <p>Recomendamos alterar a senha em <em>Meu perfil</em> após o primeiro acesso.</p>`
    : `<p>Use o mesmo e-mail e senha que você já utiliza na plataforma.</p>`;

  const html = emailShell(`
      <p>${escapeHtml(greeting)},</p>
      <p>${intro}</p>
      ${productLine}
      ${credentialsBlock}
      ${primaryButton(input.loginUrl, "Entrar na plataforma")}
      <p style="color:#666;font-size:13px">Dúvidas? Responda este e-mail ou escreva para acesso@daygomes.com.br.</p>
      <p style="color:#666;font-size:13px">Se você não reconhece este aviso, ignore este e-mail.</p>
    `);

  return sendEmail({ to: input.to, subject, html });
}

export async function sendRefundNoticeEmail(input: {
  to: string;
  loginUrl: string;
  productName?: string;
}): Promise<SendResult> {
  const productLine = input.productName
    ? `<p>Produto: <strong>${escapeHtml(input.productName)}</strong></p>`
    : "";

  const html = emailShell(`
      <p>Olá,</p>
      <p>Identificamos o <strong>reembolso</strong> da sua compra na Kiwify.</p>
      ${productLine}
      <p>O acesso ao conteúdo vinculado a essa compra foi encerrado na plataforma Day Gomes.</p>
      <p>Se você acredita que isso é um engano, entre em contato: acesso@daygomes.com.br</p>
      ${primaryButton(input.loginUrl, "Acessar a plataforma")}
    `);

  return sendEmail({
    to: input.to,
    subject: "Acesso ao curso encerrado — Day Gomes",
    html,
  });
}
