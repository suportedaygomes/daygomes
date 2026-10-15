import { SITE_DISPLAY_NAME } from "@/lib/legal/site";
import { formatTicketProtocol } from "@/lib/support/protocol";

export function buildWhatsAppUrl(phoneDigits: string, message: string) {
  const digits = phoneDigits.replace(/\D/g, "");
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

export function supportReplyWhatsAppMessage(input: {
  ticketId: string;
  ticketUrl: string;
}) {
  const protocol = formatTicketProtocol(input.ticketId);
  return (
    `Olá! Seu chamado de suporte na ${SITE_DISPLAY_NAME} (protocolo ${protocol}) foi respondido pela nossa equipe. ` +
    `Confira a resposta no painel: ${input.ticketUrl}`
  );
}

export function correctionWhatsAppMessage(input: {
  submissionId: string;
  correctionUrl: string;
}) {
  const protocol = formatTicketProtocol(input.submissionId);
  return (
    `Olá! Sua atividade na ${SITE_DISPLAY_NAME} (protocolo ${protocol}) foi corrigida. ` +
    `Veja nota e marcações no painel: ${input.correctionUrl}`
  );
}
