import { NextResponse } from "next/server";
import { runPhaseDeadlineReminders } from "@/lib/editais/run-phase-deadline-reminders";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return auth === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const result = await runPhaseDeadlineReminders();
  return NextResponse.json({ ok: true, ...result });
}
