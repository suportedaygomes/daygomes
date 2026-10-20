import { escapeHtml } from "@/lib/email/escape-html";
import { sendEmail, type SendResult } from "@/lib/email/resend";
import { buildTransactionalEmail } from "@/lib/email/transactional-layout";
import type { ReminderKind } from "@/lib/editais/phase-submission-pending";
import { themeLabel } from "@/lib/editais/theme-label";

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
  const greeting = escapeHtml(input.fullName.trim() || "Olá");
  const phaseLabel = `${themeLabel(input.phaseNumber)} — ${input.phaseTitle}`;
  const deadlineLabel = formatDeadline(input.deadlineAt);
  const daysLabel = input.reminderKind === "7_days" ? "7 dias" : "1 dia";

  const actionLine = input.isResubmit
    ? "O corretor liberou o <strong style=\"color:#121216;\">reenvio</strong> deste tema. Envie a atividade corrigida antes do prazo."
    : "Você ainda não enviou a atividade deste tema. Não perca o prazo.";

  const subject =
    input.reminderKind === "7_days"
      ? `Faltam 7 dias para enviar — ${input.editalTitle}`
      : `Último dia para enviar — ${input.editalTitle}`;

  const bodyHtml = `
      <p style="margin:0 0 12px;">${greeting},</p>
      <p style="margin:0 0 12px;">Faltam <strong style="color:#121216;">${daysLabel}</strong> para o encerramento da atividade no edital
      <strong style="color:#121216;">${escapeHtml(input.editalTitle)}</strong> (cargo: ${escapeHtml(input.cargoName)}).</p>
      <p style="margin:0 0 8px;"><strong style="color:#121216;">${escapeHtml(phaseLabel)}</strong></p>
      <p style="margin:0 0 12px;"><strong style="color:#121216;">Prazo:</strong> ${escapeHtml(deadlineLabel)}</p>
      <p style="margin:0;">${actionLine}</p>`;

  const html = buildTransactionalEmail({
    eyebrow: "Prazo de envio",
    title: input.reminderKind === "7_days" ? "Atenção ao prazo" : "Último dia para enviar",
    bodyHtml,
    button: { href: input.editaisUrl, label: "Enviar atividade no painel" },
    footerNote: "Dúvidas? Escreva para acesso@daygomes.com.br.",
  });

  return sendEmail({ to: input.to, subject, html });
}
