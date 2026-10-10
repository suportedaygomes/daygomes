import { NextResponse } from "next/server";
import { compressSubmissionFile } from "@/lib/files/compress-submission";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const form = await request.formData();
  const enrollmentId = String(form.get("enrollmentId") ?? "");
  const phaseId = String(form.get("phaseId") ?? "");
  const file = form.get("file");

  if (!enrollmentId || !phaseId || !(file instanceof File)) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const { data: enrollment } = await supabase
    .from("member_edital_enrollments")
    .select("id, member_id, cargo_id")
    .eq("id", enrollmentId)
    .eq("member_id", user.id)
    .maybeSingle();

  if (!enrollment) {
    return NextResponse.json({ error: "Inscrição inválida." }, { status: 403 });
  }

  const { data: access } = await supabase
    .from("member_phase_access")
    .select("id")
    .eq("enrollment_id", enrollmentId)
    .eq("phase_id", phaseId)
    .maybeSingle();

  if (!access) {
    return NextResponse.json({ error: "Esta fase ainda não está liberada." }, { status: 403 });
  }

  const { data: phase } = await supabase
    .from("edital_phases")
    .select("id, deadline_at, cargo_id")
    .eq("id", phaseId)
    .eq("cargo_id", enrollment.cargo_id)
    .maybeSingle();

  if (!phase) {
    return NextResponse.json({ error: "Fase inválida." }, { status: 400 });
  }

  if (new Date(phase.deadline_at) < new Date()) {
    return NextResponse.json({ error: "O prazo desta fase já encerrou." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("phase_submissions")
    .select("id")
    .eq("enrollment_id", enrollmentId)
    .eq("phase_id", phaseId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Você já enviou esta fase." }, { status: 400 });
  }

  const compressed = await compressSubmissionFile(file);
  if ("error" in compressed) {
    return NextResponse.json({ error: compressed.error }, { status: 400 });
  }

  const storagePath = `${user.id}/${enrollmentId}/${phaseId}.${compressed.extension}`;

  const { error: uploadError } = await supabase.storage
    .from("submissions")
    .upload(storagePath, compressed.buffer, {
      contentType: compressed.mimeType,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: "Falha ao enviar o arquivo." }, { status: 500 });
  }

  const { error: insertError } = await supabase.from("phase_submissions").insert({
    enrollment_id: enrollmentId,
    phase_id: phaseId,
    member_id: user.id,
    storage_path: storagePath,
    original_filename: file.name,
    mime_type: compressed.mimeType,
    file_size: compressed.buffer.length,
    status: "enviado",
  });

  if (insertError) {
    await supabase.storage.from("submissions").remove([storagePath]);
    return NextResponse.json({ error: "Não foi possível registrar o envio." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Atividade enviada com sucesso." });
}
