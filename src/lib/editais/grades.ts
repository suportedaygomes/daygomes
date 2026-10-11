export function parseSubmissionGrade(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n;
}

export function averageSubmissionGrades(grades: number[]): number | null {
  if (!grades.length) return null;
  const sum = grades.reduce((acc, grade) => acc + grade, 0);
  return Math.round((sum / grades.length) * 10) / 10;
}
