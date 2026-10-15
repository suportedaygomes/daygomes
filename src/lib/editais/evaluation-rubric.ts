export type RubricCriterion = {
  label: string;
  points: number;
  description: string;
};

export type RubricQuesito = {
  code: string;
  title: string;
  minScore: number;
  maxScore: number;
  criteria: RubricCriterion[];
};

export type EditalEvaluationRubric = {
  quesitos: RubricQuesito[];
  formula: string;
  minApprovalScore: number | null;
  approvalNote: string;
};

export type RubricScores = Record<string, number>;

export function emptyEvaluationRubric(): EditalEvaluationRubric {
  return {
    quesitos: [],
    formula: "",
    minApprovalScore: null,
    approvalNote: "",
  };
}

export function parseEvaluationRubric(value: unknown): EditalEvaluationRubric | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<EditalEvaluationRubric>;
  if (!Array.isArray(row.quesitos)) return null;

  const quesitos: RubricQuesito[] = [];
  for (const item of row.quesitos) {
    if (!item || typeof item !== "object") continue;
    const q = item as Partial<RubricQuesito>;
    const code = typeof q.code === "string" ? q.code.trim().toUpperCase() : "";
    const title = typeof q.title === "string" ? q.title.trim() : "";
    if (!code || !title) continue;

    const minScore = Number(q.minScore);
    const maxScore = Number(q.maxScore);
    if (!Number.isFinite(minScore) || !Number.isFinite(maxScore) || maxScore < minScore) {
      continue;
    }

    const criteria: RubricCriterion[] = [];
    if (Array.isArray(q.criteria)) {
      for (const c of q.criteria) {
        if (!c || typeof c !== "object") continue;
        const crit = c as Partial<RubricCriterion>;
        const label = typeof crit.label === "string" ? crit.label.trim() : "";
        const description = typeof crit.description === "string" ? crit.description.trim() : "";
        const points = Number(crit.points);
        if (!label || !description || !Number.isFinite(points)) continue;
        criteria.push({ label, points, description });
      }
    }

    quesitos.push({ code, title, minScore, maxScore, criteria });
  }

  if (!quesitos.length) return null;

  const formula = typeof row.formula === "string" ? row.formula.trim() : "";
  if (!formula) return null;

  const minApprovalScore =
    row.minApprovalScore === null || row.minApprovalScore === undefined
      ? null
      : Number(row.minApprovalScore);

  const approvalNote =
    typeof row.approvalNote === "string" ? row.approvalNote.trim() : "";

  return {
    quesitos,
    formula,
    minApprovalScore: Number.isFinite(minApprovalScore) ? minApprovalScore : null,
    approvalNote,
  };
}

export function validateEvaluationRubric(
  rubric: EditalEvaluationRubric,
): { ok: true } | { ok: false; message: string } {
  if (!rubric.quesitos.length) {
    return { ok: false, message: "Adicione pelo menos um quesito avaliativo." };
  }

  const codes = new Set<string>();
  for (const q of rubric.quesitos) {
    const code = q.code.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9_]{0,15}$/.test(code)) {
      return {
        ok: false,
        message: `Código inválido "${q.code}". Use letras/números (ex.: CAC).`,
      };
    }
    if (codes.has(code)) {
      return { ok: false, message: `Código duplicado: ${code}.` };
    }
    codes.add(code);

    if (!q.title.trim()) {
      return { ok: false, message: `Informe o título do quesito ${code}.` };
    }
    if (q.maxScore < q.minScore) {
      return { ok: false, message: `Faixa inválida no quesito ${code}.` };
    }
    if (!q.criteria.length) {
      return { ok: false, message: `Adicione critérios no quesito ${code}.` };
    }
    for (const c of q.criteria) {
      if (!c.label.trim() || !c.description.trim()) {
        return { ok: false, message: `Critério incompleto no quesito ${code}.` };
      }
    }
  }

  if (!rubric.formula.trim()) {
    return { ok: false, message: "Informe a fórmula do passo 4 (nota final)." };
  }

  try {
    const sample: RubricScores = {};
    for (const code of codes) sample[code] = 1;
    evaluateRubricFormula(rubric.formula, sample);
  } catch {
    return {
      ok: false,
      message:
        "Fórmula inválida. Use os códigos dos quesitos (ex.: CAC), números e operadores + - * / ( ).",
    };
  }

  return { ok: true };
}

export function validateRubricScores(
  rubric: EditalEvaluationRubric,
  scores: RubricScores,
): { ok: true; normalized: RubricScores } | { ok: false; message: string } {
  const normalized: RubricScores = {};

  for (const q of rubric.quesitos) {
    const value = Number(scores[q.code]);
    if (!Number.isFinite(value)) {
      return { ok: false, message: `Informe a nota do quesito ${q.code}.` };
    }
    if (value < q.minScore || value > q.maxScore) {
      return {
        ok: false,
        message: `Nota do quesito ${q.code} deve estar entre ${q.minScore} e ${q.maxScore}.`,
      };
    }
    normalized[q.code] = Math.round(value * 100) / 100;
  }

  return { ok: true, normalized };
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Avalia a fórmula com os códigos dos quesitos já substituídos por números. */
export function evaluateRubricFormula(formula: string, scores: RubricScores): number {
  let expr = formula.trim();
  expr = expr.replace(/×/g, "*").replace(/÷/g, "/");
  expr = expr.replace(/(\d)\s*,\s*(\d)/g, "$1.$2");

  const sortedCodes = Object.keys(scores).sort((a, b) => b.length - a.length);
  for (const code of sortedCodes) {
    const re = new RegExp(`\\b${escapeRegExp(code)}\\b`, "gi");
    expr = expr.replace(re, `(${scores[code]})`);
  }

  if (/[a-zA-Z_]/.test(expr)) {
    throw new Error("Fórmula contém códigos desconhecidos.");
  }

  if (!/^[\d+\-*/().\s]+$/.test(expr)) {
    throw new Error("Caracteres não permitidos na fórmula.");
  }

  const result = Function(`"use strict"; return (${expr});`)();
  const num = Number(result);
  if (!Number.isFinite(num)) {
    throw new Error("Resultado inválido.");
  }
  return Math.round(num * 1000) / 1000;
}

export function computeFinalGrade(
  rubric: EditalEvaluationRubric,
  scores: RubricScores,
): number {
  const raw = evaluateRubricFormula(rubric.formula, scores);
  const clamped = Math.min(1000, Math.max(0, raw));
  return Math.round(clamped * 10) / 10;
}

export function buildRubricFeedbackSummary(
  rubric: EditalEvaluationRubric,
  scores: RubricScores,
  finalGrade: number,
): string {
  const lines: string[] = ["Quesitos avaliativos", ""];

  for (const q of rubric.quesitos) {
    const nota = scores[q.code];
    lines.push(`${q.title} (${q.code})`);
    lines.push(`Faixa: ${formatScore(q.minScore)} a ${formatScore(q.maxScore)}`);
    lines.push(`Nota atribuída: ${formatScore(nota)}`);
    lines.push("");
    for (const c of q.criteria) {
      lines.push(
        `${c.label}) ${formatScore(c.points)} — ${c.description}`,
      );
    }
    lines.push("");
  }

  lines.push("Resultado (passo 4)");
  lines.push(`Fórmula: ${rubric.formula}`);
  lines.push(`Nota final (0 a 1000): ${formatScore(finalGrade)}`);
  if (rubric.minApprovalScore != null) {
    lines.push(
      `Mínimo para aprovação: ${formatScore(rubric.minApprovalScore)}${rubric.approvalNote ? ` — ${rubric.approvalNote}` : ""}`,
    );
  } else if (rubric.approvalNote) {
    lines.push(rubric.approvalNote);
  }

  return lines.join("\n").trim();
}

function formatScore(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function defaultSampleRubric(): EditalEvaluationRubric {
  return {
    quesitos: [
      {
        code: "CAC",
        title: "Conteúdo e Atendimento ao Comando (CAC)",
        minScore: 0,
        maxScore: 3,
        criteria: [
          {
            label: "a",
            points: 0,
            description:
              "Não atende ao comando ou é incompatível com o tema proposto.",
          },
          {
            label: "b",
            points: 1,
            description: "Atendimento insuficiente ou superficial ao comando.",
          },
          {
            label: "c",
            points: 2,
            description: "Atendimento adequado, com pequenas limitações.",
          },
          {
            label: "d",
            points: 3,
            description: "Atendimento pleno e consistente ao comando.",
          },
        ],
      },
      {
        code: "OT",
        title: "Organização Textual (OT)",
        minScore: 0,
        maxScore: 3,
        criteria: [
          {
            label: "a",
            points: 0,
            description: "Texto desorganizado ou incoerente.",
          },
          {
            label: "b",
            points: 1,
            description: "Organização insuficiente ou pouco clara.",
          },
          {
            label: "c",
            points: 2,
            description: "Organização adequada e estrutura compreensível.",
          },
          {
            label: "d",
            points: 3,
            description: "Texto bem organizado, claro e consistente.",
          },
        ],
      },
      {
        code: "DLP",
        title: "Domínio da Modalidade Escrita da Língua Portuguesa (DLP)",
        minScore: 0,
        maxScore: 3,
        criteria: [
          {
            label: "a",
            points: 0,
            description: "Erros graves e frequentes de gramática e ortografia.",
          },
          {
            label: "b",
            points: 1,
            description: "Erros frequentes de gramática e vocabulário.",
          },
          {
            label: "c",
            points: 2,
            description: "Domínio adequado, com erros ocasionais.",
          },
          {
            label: "d",
            points: 3,
            description: "Domínio seguro, com falhas pontuais.",
          },
        ],
      },
    ],
    formula: "[(CAC * 7) + (OT * 1.5) + (DLP * 1.5)] / 0.3",
    minApprovalScore: 50,
    approvalNote:
      "O candidato será considerado aprovado se obtiver nota igual ou superior a 50,00 pontos.",
  };
}
