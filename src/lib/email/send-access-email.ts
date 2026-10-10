import nodemailer from "nodemailer";

type SendAccessEmailInput = {
  to: string;
  fullName: string;
  loginUrl: string;
  password?: string;
  productName?: string;
};

type SendResult = { ok: true } | { ok: false; error: string };

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

  if (!host || !user || !pass || !from) {
    return null;
  }

  return { host, port, user, pass, from };
}

export async function sendAccessEmail(input: SendAccessEmailInput): Promise<SendResult> {
  const smtp = getSmtpConfig();
  if (!smtp) {
    return { ok: false, error: "SMTP não configurado no servidor." };
  }

  const isNewAccount = Boolean(input.password);
  const subject = isNewAccount
    ? "Seu acesso ao Day Gomes foi liberado"
    : "Novo curso liberado no Day Gomes";

  const greeting = input.fullName.trim() || "Olá";
  const productLine = input.productName
    ? `<p>Curso/produto: <strong>${escapeHtml(input.productName)}</strong></p>`
    : "";

  const credentialsBlock = isNewAccount
    ? `<p><strong>E-mail:</strong> ${escapeHtml(input.to)}<br />
       <strong>Senha temporária:</strong> ${escapeHtml(input.password ?? "")}</p>
       <p>Recomendamos alterar a senha em <em>Meu perfil</em> após o primeiro acesso.</p>`
    : `<p>Use o mesmo e-mail e senha que você já utiliza na plataforma.</p>`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
      <p>${escapeHtml(greeting)},</p>
      <p>Sua compra na Kiwify foi confirmada e o acesso à plataforma Day Gomes já está liberado.</p>
      ${productLine}
      ${credentialsBlock}
      <p><a href="${escapeHtml(input.loginUrl)}" style="display:inline-block;padding:12px 18px;background:#8e3ebe;color:#fff;text-decoration:none;border-radius:10px">Entrar na plataforma</a></p>
      <p style="color:#666;font-size:13px">Se você não reconhece esta compra, ignore este e-mail.</p>
    </div>
  `;

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  try {
    await transporter.sendMail({
      from: smtp.from,
      to: input.to,
      subject,
      html,
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao enviar e-mail.";
    return { ok: false, error: message };
  }
}

export async function sendRefundNoticeEmail(input: {
  to: string;
  loginUrl: string;
  productName?: string;
}): Promise<SendResult> {
  const smtp = getSmtpConfig();
  if (!smtp) {
    return { ok: false, error: "SMTP não configurado no servidor." };
  }

  const productLine = input.productName
    ? `<p>Produto: <strong>${escapeHtml(input.productName)}</strong></p>`
    : "";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
      <p>Olá,</p>
      <p>Identificamos o <strong>reembolso</strong> da sua compra na Kiwify.</p>
      ${productLine}
      <p>O acesso ao conteúdo vinculado a essa compra foi encerrado na plataforma Day Gomes.</p>
      <p>Se você acredita que isso é um engano, entre em contato com nosso suporte.</p>
      <p><a href="${escapeHtml(input.loginUrl)}">Acessar a plataforma</a></p>
    </div>
  `;

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  try {
    await transporter.sendMail({
      from: smtp.from,
      to: input.to,
      subject: "Acesso ao curso encerrado — Day Gomes",
      html,
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao enviar e-mail.";
    return { ok: false, error: message };
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
