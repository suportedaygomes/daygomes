export type ActivityKind = "dissertativa" | "estudo_caso";

export const ACTIVITY_KIND_LABEL: Record<ActivityKind, string> = {
  dissertativa: "Redação dissertativa",
  estudo_caso: "Estudo de caso",
};

export function activityKindShortLabel(kind: ActivityKind) {
  return kind === "dissertativa" ? "Dissertativa" : "Estudo de caso";
}

export function cargoDisplayName(name: string, kind: ActivityKind) {
  return `${name} (${activityKindShortLabel(kind)})`;
}

export function parseActivityKind(value: unknown): ActivityKind | null {
  if (value === "dissertativa" || value === "estudo_caso") return value;
  return null;
}
