import { NextResponse } from "next/server";
import { rotateDocumentBuffer } from "@/lib/markup/rotate-document-buffer";
import { getR2ObjectStream } from "@/lib/r2/storage";
import {
  getSubmissionForUser,
  getSubmissionPreviewPath,
} from "@/lib/submissions/access";
import {
  isRotatablePreview,
  resolveSubmissionPreviewRotation,
} from "@/lib/submissions/preview-rotation";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const access = await getSubmissionForUser(supabase, id, user.id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const submission = access.submission;
  const url = new URL(_request.url);
  const source = url.searchParams.get("source");
  const path =
    source === "original"
      ? submission.storage_path
      : getSubmissionPreviewPath(submission);

  const rotatable = isRotatablePreview(submission.mime_type, path);
  const rotation = await resolveSubmissionPreviewRotation(supabase, id, url, rotatable);

  async function respondWithBytes(raw: Buffer, contentType: string) {
    let body = raw;
    let outputType = contentType;
    if (rotation !== 0) {
      body = await rotateDocumentBuffer(raw, contentType, rotation);
    }
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": outputType,
        "Content-Length": String(body.byteLength),
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=300",
      },
    });
  }

  if (path.startsWith("submissions/")) {
    const object = await getR2ObjectStream(path);
    if (!object.ok) {
      return NextResponse.json({ error: object.error }, { status: 404 });
    }

    const bytes = await object.body.transformToByteArray();
    const contentType =
      path.endsWith(".pdf") || submission.mime_type === "application/pdf"
        ? "application/pdf"
        : submission.mime_type ?? object.contentType;
    return respondWithBytes(Buffer.from(bytes), contentType);
  }

  const { data, error } = await supabase.storage.from("submissions").download(path);

  if (error || !data) {
    return NextResponse.json({ error: "Arquivo indisponível." }, { status: 404 });
  }

  const arrayBuffer = await data.arrayBuffer();
  return respondWithBytes(
    Buffer.from(arrayBuffer),
    submission.mime_type ?? "application/octet-stream",
  );
}