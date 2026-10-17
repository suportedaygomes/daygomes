import { NextResponse } from "next/server";
import { provisionKiwifyOrder } from "@/lib/kiwify/provision-access";
import { isKiwifyRefundEvent, revokeKiwifyOrder } from "@/lib/kiwify/revoke-access";
import { isKiwifyOrderApproved, type KiwifyOrderWebhook } from "@/lib/kiwify/types";

function isAuthorized(request: Request) {
  const expected = process.env.KIWIFY_WEBHOOK_TOKEN?.trim();
  if (!expected) return false;

  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  const headerToken =
    request.headers.get("x-kiwify-token") ??
    request.headers.get("x-webhook-token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  return queryToken === expected || headerToken === expected;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let payload: KiwifyOrderWebhook;
  try {
    payload = (await request.json()) as KiwifyOrderWebhook;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (isKiwifyRefundEvent(payload)) {
    const result = await revokeKiwifyOrder(payload);
    if (!result.ok) {
      console.error("[kiwify-webhook:refund]", result.error, result.orderId);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      action: "refund",
      orderId: result.orderId,
      skipped: result.skipped ?? false,
      reason: result.reason,
    });
  }

  if (!isKiwifyOrderApproved(payload)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const result = await provisionKiwifyOrder(payload);

  if (!result.ok) {
    console.error("[kiwify-webhook:approve]", result.error, "orderId=", result.orderId);
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    action: "approve",
    orderId: result.orderId,
    skipped: result.skipped ?? false,
    reason: result.reason,
  });
}
