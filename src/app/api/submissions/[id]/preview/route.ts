import { NextResponse } from "next/server";
import { getR2ObjectStream } from "@/lib/r2/storage";
import { getSubmissionForUser, getSubmissionPreviewPath } from "@/lib/submissions/access";
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
  const path = getSubmissionPreviewPath(submission);

  if (path.startsWith("submissions/")) {
    const object = await getR2ObjectStream(path);
    if (!object.ok) {
      return NextResponse.json({ error: object.error }, { status: 404 });
    }

    const body = object.body.transformToWebStream();
    return new NextResponse(body, {
      headers: {
        "Content-Type":
          path.endsWith(".pdf") || submission.preview_storage_path
            ? "application/pdf"
            : submission.mime_type ?? object.contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  }

  const { data, error } = await supabase.storage
    .from("submissions")
    .download(submission.storage_path);

  if (error || !data) {
    return NextResponse.json({ error: "Arquivo indisponível." }, { status: 404 });
  }

  return new NextResponse(data.stream(), {
    headers: {
      "Content-Type": submission.mime_type ?? "application/octet-stream",
      "Cache-Control": "private, max-age=300",
    },
  });
}
