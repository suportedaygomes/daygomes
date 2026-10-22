import { NextResponse } from "next/server";
import {
  isValidMetaWebhookSignature,
  readWhatsAppAppSecret,
  readWhatsAppVerifyToken,
} from "@/lib/whatsapp/webhook-auth";

export const runtime = "nodejs";

/** Verificação do callback (Meta envia GET ao clicar em "Verificar e salvar"). */
export async function GET(request: Request) {
  const verifyToken = readWhatsAppVerifyToken();
  if (!verifyToken) {
    console.error("[whatsapp-webhook] WHATSAPP_WEBHOOK_VERIFY_TOKEN não configurado");
    return new NextResponse("Webhook não configurado.", { status: 503 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new NextResponse("Token de verificação inválido.", { status: 403 });
}

/** Notificações de mensagens e status (WhatsApp Cloud API). */
export async function POST(request: Request) {
  const rawBody = await request.text();

  const appSecret = readWhatsAppAppSecret();
  if (appSecret) {
    const signature = request.headers.get("x-hub-signature-256");
    if (!isValidMetaWebhookSignature(rawBody, signature, appSecret)) {
      console.warn("[whatsapp-webhook] assinatura inválida");
      return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
    }
  }

  let payload: unknown;
  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (payload && typeof payload === "object") {
    console.info("[whatsapp-webhook] evento recebido", JSON.stringify(payload).slice(0, 2000));
  }

  // Meta exige resposta 200 rápida; processamento pesado deve ser assíncrono depois.
  return NextResponse.json({ ok: true });
}
