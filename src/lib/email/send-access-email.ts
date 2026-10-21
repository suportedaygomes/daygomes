import { escapeHtml } from "@/lib/email/escape-html";
import { sendEmail, type SendResult } from "@/lib/email/resend";
import {
  buildTransactionalEmail,
  EMAIL_STRONG_COLOR,
  transactionalEmailAlertBox,
} from "@/lib/email/transactional-layout";
import { SITE_DISPLAY_NAME } from "@/lib/legal/site";

type SendAccessEmailInput = {
  to: string;
  fullName: string;
  loginUrl: string;
  password?: string;
  productName?: string;
  source?: "kiwify" | "admin";
};

export async function sendAccessEmail(input: SendAccessEmailInput): Promise<SendResult> {
  const isNewAccount = Boolean(input.password);
  const source = input.source ?? "kiwify";
  const greeting = escapeHtml(input.fullName.trim() || "Olá");

  const subject = isNewAccount
    ? `Seu acesso à ${SITE_DISPLAY_NAME} foi liberado`
    : `Novo curso liberado na ${SITE_DISPLAY_NAME}`;

  const intro =
    source === "admin"
      ? `Sua conta na plataforma ${SITE_DISPLAY_NAME} foi criada.`
      : `Sua compra na Kiwify foi confirmada e o acesso à plataforma ${SITE_DISPLAY_NAME} já está liberado.`;

  const productLine = input.productName
    ? `<p style="margin:0 0 12px;">Curso/produto: <strong style="color:${EMAIL_STRONG_COLOR};">${escapeHtml(input.productName)}</strong></p>`
    : "";

  const credentialsBlock = isNewAccount
    ? `<p style="margin:0 0 12px;"><strong style="color:${EMAIL_STRONG_COLOR};">E-mail:</strong> ${escapeHtml(input.to)}<br />
       <strong style="color:${EMAIL_STRONG_COLOR};">Senha temporária:</strong> ${escapeHtml(input.password ?? "")}</p>
       <p style="margin:0 0 12px;">Recomendamos alterar a senha em <em>Meu perfil</em> após o primeiro acesso.</p>`
    : `<p style="margin:0 0 12px;">Use o mesmo e-mail e senha que você já utiliza na plataforma.</p>`;

  const platformNotice = isNewAccount
    ? transactionalEmailAlertBox(
        "Leia antes de entrar: onde ficam as aulas e onde enviar a redação",
        `<p style="margin:0 0 10px;"><strong style="color:${EMAIL_STRONG_COLOR};">Este site (daygomes.com.br) NÃO é o portal de videoaulas.</strong> Ele serve <strong style="color:${EMAIL_STRONG_COLOR};">apenas</strong> para você <strong style="color:${EMAIL_STRONG_COLOR};">enviar suas redações</strong> e receber as <strong style="color:${EMAIL_STRONG_COLOR};">correções</strong> da equipe da Professora Day.</p>
         <p style="margin:0;"><strong style="color:${EMAIL_STRONG_COLOR};">Todos os vídeos, módulos e materiais em vídeo do curso</strong> estão na <strong style="color:${EMAIL_STRONG_COLOR};">Kiwify</strong> — na área de membros da sua compra. Assista às aulas pela Kiwify; use este login somente para mandar textos e ver o feedback das correções.</p>`,
      )
    : "";

  const bodyHtml = `
      ${platformNotice}
      <p style="margin:0 0 12px;">${greeting},</p>
      <p style="margin:0 0 12px;">${intro}</p>
      ${productLine}
      ${credentialsBlock}`;

  const html = buildTransactionalEmail({
    eyebrow: isNewAccount ? "Acesso liberado" : "Novo conteúdo",
    title: isNewAccount ? `Bem-vindo(a) à ${SITE_DISPLAY_NAME}` : "Novo curso disponível",
    bodyHtml,
    button: { href: input.loginUrl, label: "Entrar na plataforma" },
    footerNote: "Se você não reconhece este aviso, ignore este e-mail.",
  });

  return sendEmail({ to: input.to, subject, html });
}

export async function sendRefundNoticeEmail(input: {
  to: string;
  loginUrl: string;
  productName?: string;
}): Promise<SendResult> {
  const productLine = input.productName
    ? `<p style="margin:0 0 12px;">Produto: <strong style="color:${EMAIL_STRONG_COLOR};">${escapeHtml(input.productName)}</strong></p>`
    : "";

  const bodyHtml = `
      <p style="margin:0 0 12px;">Olá,</p>
      <p style="margin:0 0 12px;">Identificamos o <strong style="color:${EMAIL_STRONG_COLOR};">reembolso</strong> da sua compra na Kiwify.</p>
      ${productLine}
      <p style="margin:0 0 12px;">O acesso ao conteúdo vinculado a essa compra foi encerrado na plataforma ${SITE_DISPLAY_NAME}.</p>
      <p style="margin:0;">Se você acredita que isso é um engano, entre em contato: acesso@daygomes.com.br</p>`;

  const html = buildTransactionalEmail({
    eyebrow: "Kiwify",
    title: "Acesso encerrado",
    bodyHtml,
    button: { href: input.loginUrl, label: "Acessar a plataforma" },
  });

  return sendEmail({
    to: input.to,
    subject: `Acesso ao curso encerrado — ${SITE_DISPLAY_NAME}`,
    html,
  });
}
