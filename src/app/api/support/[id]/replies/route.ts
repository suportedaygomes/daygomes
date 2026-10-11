import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { sendSupportReplyEmail } from "@/lib/email/send-support-reply-email";
import { isR2Configured } from "@/lib/r2/config";
import {
  putR2Object,
  supportReplyAttachmentKey,
} from "@/lib/r2/storage";
import {
  extensionForImageMime,
  validateSupportAttachmentFile,
} from "@/lib/support/validate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id: ticketId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, banned")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.banned) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  if (profile.role !== "corretor" && profile.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const form = await request.formData();
  const body = String(form.get("body") ?? "").trim();
  const closeTicket = String(form.get("closeTicket") ?? "") === "true";
  const file = form.get("file");
  const imageFile = file instanceof File && file.size > 0 ? file : null;

  if (body.length < 10) {
    return NextResponse.json(
      { error: "A resposta deve ter pelo menos 10 caracteres." },
      { status: 400 },
    );
  }

  if (imageFile) {
    const check = validateSupportAttachmentFile(imageFile);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }
  }

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("support_tickets")
    .select("id, title, status, requester_email, requester_name, member_id")
    .eq("id", ticketId)
    .maybeSingle();

  if (!ticket) {
    return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 });
  }

  const replyId = randomUUID();
  let attachmentPath: string | null = null;
  let attachmentMime: string | null = null;
  let attachmentBuffer: Buffer | null = null;

  if (imageFile) {
    if (!isR2Configured()) {
      return NextResponse.json({ error: "Armazenamento indisponível." }, { status: 503 });
    }

    const buffer = Buffer.from(await imageFile.arrayBuffer());
    attachmentBuffer = buffer;
    attachmentMime = imageFile.type;
    attachmentPath = supportReplyAttachmentKey(
      ticketId,
      replyId,
      extensionForImageMime(imageFile.type),
    );

    const upload = await putR2Object({
      key: attachmentPath,
      body: buffer,
      contentType: imageFile.type,
    });

    if (!upload.ok) {
      return NextResponse.json({ error: "Não foi possível enviar a imagem." }, { status: 500 });
    }
  }

  const { error: replyError } = await admin.from("support_ticket_replies").insert({
    id: replyId,
    ticket_id: ticketId,
    author_id: user.id,
    body,
    attachment_path: attachmentPath,
    attachment_mime: attachmentMime,
  });

  if (replyError) {
    return NextResponse.json({ error: "Não foi possível salvar a resposta." }, { status: 500 });
  }

  const nextStatus = closeTicket ? "resolvido" : "em_atendimento";
  await admin
    .from("support_tickets")
    .update({
      status: nextStatus,
      handled_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const hasPortalAccess = Boolean(ticket.member_id);

  const emailResult = await sendSupportReplyEmail({
    to: ticket.requester_email,
    fullName: ticket.requester_name ?? "",
    ticketTitle: ticket.title,
    ticketId,
    replyBody: body,
    hasPortalAccess,
    ticketUrl: hasPortalAccess
      ? `${siteUrl}/painel/suporte/chamado/${ticketId}`
      : undefined,
    attachment:
      attachmentBuffer && attachmentMime
        ? { buffer: attachmentBuffer, mime: attachmentMime }
        : null,
  });

  const emailNote = emailResult.ok
    ? " E-mail enviado ao aluno."
    : ` E-mail não enviado (${emailResult.error}).`;

  return NextResponse.json({
    ok: true,
    message: `Resposta registrada.${emailNote}`,
  });
}
