import { escapeHtml } from "@/lib/email/escape-html";
import { sendEmail, type SendResult } from "@/lib/email/resend";
import { buildTransactionalEmail } from "@/lib/email/transactional-layout";
import { themeLabel } from "@/lib/editais/theme-label";

type SendCorrectionNoticeEmailInput = {
  to: string;
  fullName: string;
  editalTitle: string;
  phaseTitle: string;
  phaseNumber: number;
  grade: number;
  correctionUrl: string;
};

export async function sendCorrectionNoticeEmail(
  input: SendCorrectionNoticeEmailInput,
): Promise<SendResult> {
  const greeting = escapeHtml(input.fullName.trim() || "Olá");
  const phaseLabel = `${themeLabel(input.phaseNumber)} — ${input.phaseTitle}`;

  const bodyHtml = `
      <p style="margin:0 0 12px;">${greeting},</p>
      <p style="margin:0 0 12px;">Sua atividade no edital <strong style="color:#121216;">${escapeHtml(input.editalTitle)}</strong> foi corrigida.</p>
      <p style="margin:0 0 8px;"><strong style="color:#121216;">${escapeHtml(phaseLabel)}</strong></p>
      <p style="margin:0 0 12px;">Nota: <strong style="color:#ab5fd0;font-size:18px;">${escapeHtml(String(input.grade))}</strong></p>
      <p style="margin:0;">No painel você pode baixar seu envio original, ver os grifos no texto e ler os comentários de cada erro.</p>`;

  const html = buildTransactionalEmail({
    eyebrow: "Correção",
    title: "Sua atividade foi corrigida",
    bodyHtml,
    button: { href: input.correctionUrl, label: "Ver minha correção" },
    footerNote: "Dúvidas? Responda este e-mail ou escreva para acesso@daygomes.com.br.",
  });

  return sendEmail({
    to: input.to,
    subject: `Atividade corrigida — ${input.editalTitle}`,
    html,
  });
}
