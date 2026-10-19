import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  fields.push(current);
  return fields;
}

const csvPath = resolve(process.cwd(), process.argv[2] ?? "scripts/sales_uwk0ek_1792424371576.csv");
const content = readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
const lines = content.split(/\r?\n/).filter((line) => line.trim());
const counts = new Map<string, number>();

for (let i = 1; i < lines.length; i += 1) {
  const cols = parseCsvLine(lines[i]);
  const status = (cols[1] ?? "").trim().toLowerCase();
  if (status !== "paid") continue;
  const product = (cols[2] ?? "").trim();
  counts.set(product, (counts.get(product) ?? 0) + 1);
}

console.log(`Arquivo: ${csvPath}`);
console.log(`Produtos distintos (pagos): ${counts.size}`);
console.log(`Total vendas pagas: ${[...counts.values()].reduce((a, b) => a + b, 0)}`);
console.log("");
for (const [name, count] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`${count}\t${name}`);
}
