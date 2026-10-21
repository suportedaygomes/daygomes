"use client";

import { useEffect, useRef } from "react";
import type { EditalAdminDraftPatch } from "@/lib/editais/edital-admin-draft";

type Options = {
  editalId: string;
  publishedRevision: string;
  enabled: boolean;
  patch: Omit<EditalAdminDraftPatch, "publishedRevision">;
  debounceMs?: number;
};

export function useEditalAdminDraftSync({
  editalId,
  publishedRevision,
  enabled,
  patch,
  debounceMs = 800,
}: Options) {
  const lastSentRef = useRef<string>("");

  useEffect(() => {
    if (!enabled) return;

    const body: EditalAdminDraftPatch = { publishedRevision, ...patch };
    const serialized = JSON.stringify(body);
    if (serialized === lastSentRef.current) return;

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/editais/${editalId}/draft`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: serialized,
        });
        if (response.ok) {
          lastSentRef.current = serialized;
        }
      } catch {
        // ignore network errors; user can retry by editing
      }
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [debounceMs, editalId, enabled, patch, publishedRevision]);
}

export async function clearEditalAdminDraftSectionClient(
  editalId: string,
  section: "structure" | "evaluationRubric",
) {
  await fetch(`/api/admin/editais/${editalId}/draft?section=${section}`, {
    method: "DELETE",
  });
}

export async function migrateLocalEditalDraftToServer(
  editalId: string,
  publishedRevision: string,
) {
  const key = `edital-edit-draft:${editalId}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      title?: string;
      submissionPeriodDays?: number;
      defaultCorrectionQuota?: number;
      cargos?: unknown;
    };
    if (!parsed.cargos) return;

    await fetch(`/api/admin/editais/${editalId}/draft`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publishedRevision,
        structure: {
          title: parsed.title ?? "",
          submissionPeriodDays: parsed.submissionPeriodDays ?? 30,
          defaultCorrectionQuota: parsed.defaultCorrectionQuota ?? 4,
          cargos: parsed.cargos,
        },
      }),
    });
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
