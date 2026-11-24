import { NextResponse } from "next/server";
import { normalizeImageRotation } from "@/lib/markup/image-rotation";
import type { MarkupAnnotation } from "@/lib/markup/types";
import { getSubmissionForUser } from "@/lib/submissions/access";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

function parseAnnotations(value: unknown): MarkupAnnotation[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object" && "id" in item)
    .map((item) => {
      const row = item as MarkupAnnotation;
      return { ...row, page: row.page && row.page > 0 ? row.page : 1 };
    });
}

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

  const { data } = await supabase
    .from("submission_markups")
    .select("annotations, image_rotation")
    .eq("submission_id", id)
    .maybeSingle();

  return NextResponse.json({
    annotations: parseAnnotations(data?.annotations),
    imageRotation: normalizeImageRotation(data?.image_rotation),
  });
}

export async function PUT(request: Request, context: RouteContext) {
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

  const { profile } = access;
  if (profile.role !== "corretor" && profile.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = (await request.json()) as {
    annotations?: MarkupAnnotation[];
    imageRotation?: unknown;
  };
  const annotations = parseAnnotations(body.annotations);
  const imageRotation = normalizeImageRotation(body.imageRotation);

  const { error } = await supabase.from("submission_markups").upsert(
    {
      submission_id: id,
      corrector_id: user.id,
      annotations,
      image_rotation: imageRotation,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "submission_id" },
  );

  if (error) {
    return NextResponse.json({ error: "Não foi possível salvar as marcações." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
