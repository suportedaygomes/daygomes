"use client";

import { useMemo } from "react";
import { normalizePhaseDescriptionForDisplay } from "@/lib/rich-text/phase-description";

type Props = {
  html: string;
  className?: string;
};

export function PhaseDescriptionContent({ html, className = "" }: Props) {
  const safe = useMemo(() => normalizePhaseDescriptionForDisplay(html), [html]);
  if (!safe) return null;

  return (
    <div
      className={`phase-description-prose text-sm leading-6 text-muted ${className}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}