import { escapeHtml } from "@/lib/email/escape-html";
import { sendEmail, type SendResult } from "@/lib/email/resend";
import type { ReminderKind } from "@/lib/editais/phase-submission-pending";

type SendPhaseDeadlineReminderEmailInput = {
  to: string;
  fullName: string;
  editalTitle: string;
  cargoName: string;
  phaseTitle: string;
  phaseNumber: number;
  deadlineAt: Date;
  reminderKind: ReminderKind;
  isResubmit: boolean;
  editaisUrl: string;
};

function primaryButton(href: string, label: string) {
  return `<p><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 18px;background:#8e3ebe;color:#fff;text-decoration:none;border-radius:10px">${escapeHtml(label)}</a></p>`;
}

function formatDeadline(date: Date) {
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "medium",
  });
}

export async function sendPhaseDeadlineReminderEmail(
  input: SendPhaseDeadlineReminderEmailInput,
): Promise<SendResult> {
  const greeting = input.fullName.trim() || "Olá";
  const phaseLabel = `Fase ${input.phaseNumber} — ${input.phaseTitle}`;
  const deadlineLabel = formatDeadline(input.deadlineAt);
  const daysLabel = input.reminderKind === "7_days" ? "7 dias" : "1 dia";

  const actionLine = input.isResubmit
    ? "O corretor liberou o <strong>reenvio</strong> desta fase. Envie a atividade corrigida antes do prazo."
    : "Você ainda não enviou a atividade desta fase. Não perca o prazo.";

  const subject =
    input.reminderKind === "7_days"
      ? `Faltam 7 dias para enviar — ${input.editalTitle}`
      : `Último dia para enviar — ${input.editalTitle}`;

  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px">
      <p>${escapeHtml(greeting)},</p>
      <p>Faltam <strong>${daysLabel}</strong> para o encerramento da atividade no edital
      <strong>${escapeHtml(input.editalTitle)}</strong> (cargo: ${escapeHtml(input.cargoName)}).</p>
      <p><strong>${escapeHtml(phaseLabel)}</strong></p>
      <p><strong>Prazo:</strong> ${escapeHtml(deadlineLabel)}</p>
      <p>${actionLine}</p>
      ${primaryButton(input.editaisUrl, "Enviar atividade no painel")}
      <p style="color:#666;font-size:13px">Dúvidas? Escreva para acesso@daygomes.com.br.</p>
    </div>`;

  return sendEmail({ to: input.to, subject, html });
}
