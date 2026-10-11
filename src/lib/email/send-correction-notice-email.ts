import { escapeHtml } from "@/lib/email/escape-html";
import { sendEmail, type SendResult } from "@/lib/email/resend";

type SendCorrectionNoticeEmailInput = {
  to: string;
  fullName: string;
  editalTitle: string;
  phaseTitle: string;
  phaseNumber: number;
  grade: number;
  correctionUrl: string;
};

function primaryButton(href: string, label: string) {
  return `<p><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 18px;background:#8e3ebe;color:#fff;text-decoration:none;border-radius:10px">${escapeHtml(label)}</a></p>`;
}

export async function sendCorrectionNoticeEmail(
  input: SendCorrectionNoticeEmailInput,
): Promise<SendResult> {
  const greeting = input.fullName.trim() || "Olá";
  const phaseLabel = `Fase ${input.phaseNumber} — ${input.phaseTitle}`;

  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px">
      <p>${escapeHtml(greeting)},</p>
      <p>Sua atividade no edital <strong>${escapeHtml(input.editalTitle)}</strong> foi corrigida.</p>
      <p><strong>${escapeHtml(phaseLabel)}</strong><br />
      Nota: <strong>${escapeHtml(String(input.grade))}</strong></p>
      <p>No painel você pode baixar seu envio original, ver os grifos no texto e ler os comentários de cada erro.</p>
      ${primaryButton(input.correctionUrl, "Ver minha correção")}
      <p style="color:#666;font-size:13px">Dúvidas? Escreva para acesso@daygomes.com.br.</p>
    </div>`;

  return sendEmail({
    to: input.to,
    subject: `Atividade corrigida — ${input.editalTitle}`,
    html,
  });
}
