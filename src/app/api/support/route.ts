import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { isR2Configured } from "@/lib/r2/config";
import { putR2Object, supportAttachmentKey } from "@/lib/r2/storage";
import {
  extensionForImageMime,
  normalizeWhatsapp,
  validateSupportPayload,
} from "@/lib/support/validate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const whatsapp = String(form.get("whatsapp") ?? "");
  const title = String(form.get("title") ?? "");
  const description = String(form.get("description") ?? "");
  const file = form.get("file");

  const imageFile = file instanceof File && file.size > 0 ? file : null;

  const validated = validateSupportPayload({
    email,
    whatsapp,
    title,
    description,
    file: imageFile,
  });

  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let memberId: string | null = null;
  let requesterName: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, whatsapp, role, banned")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.banned) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 403 });
    }

    memberId = profile.id;
    requesterName = profile.full_name?.trim() || null;

    const memberEmail = (profile.email ?? user.email ?? validated.data.email).trim().toLowerCase();
    const memberWhatsapp = normalizeWhatsapp(profile.whatsapp ?? "");

    validated.data.email = memberEmail;

    if (memberWhatsapp.length >= 10) {
      validated.data.whatsapp = memberWhatsapp;
    } else {
      const formWhatsapp = normalizeWhatsapp(validated.data.whatsapp);
      if (formWhatsapp.length < 10) {
        return NextResponse.json(
          { error: "Informe um WhatsApp válido com DDD." },
          { status: 400 },
        );
      }
      validated.data.whatsapp = formWhatsapp;

      const { error: whatsappUpdateError } = await supabase
        .from("profiles")
        .update({ whatsapp: formWhatsapp, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (whatsappUpdateError) {
        return NextResponse.json(
          { error: "Não foi possível salvar o WhatsApp." },
          { status: 500 },
        );
      }
    }
  }

  const ticketId = randomUUID();
  let attachmentPath: string | null = null;
  let attachmentMime: string | null = null;

  if (imageFile) {
    if (!isR2Configured()) {
      return NextResponse.json({ error: "Armazenamento indisponível." }, { status: 503 });
    }

    const buffer = Buffer.from(await imageFile.arrayBuffer());
    attachmentMime = imageFile.type;
    const extension = extensionForImageMime(imageFile.type);
    attachmentPath = supportAttachmentKey(ticketId, extension);

    const upload = await putR2Object({
      key: attachmentPath,
      body: buffer,
      contentType: imageFile.type,
    });

    if (!upload.ok) {
      return NextResponse.json({ error: "Não foi possível enviar a imagem." }, { status: 500 });
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.from("support_tickets").insert({
    id: ticketId,
    member_id: memberId,
    requester_name: requesterName,
    requester_email: validated.data.email,
    requester_whatsapp: validated.data.whatsapp,
    title: validated.data.title,
    description: validated.data.description,
    attachment_path: attachmentPath,
    attachment_mime: attachmentMime,
    status: "aberto",
  });

  if (error) {
    return NextResponse.json({ error: "Não foi possível registrar o pedido." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Ticket enviado.",
    ticketId,
  });
}
