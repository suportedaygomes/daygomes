/**
 * Importa vendas pagas de um CSV exportado pela Kiwify.
 *
 * Uso:
 *   npx tsx scripts/import-kiwify-sales-csv.ts scripts/sales_....csv
 *   npx tsx scripts/import-kiwify-sales-csv.ts scripts/sales_....csv --dry-run
 *   npx tsx scripts/import-kiwify-sales-csv.ts scripts/sales_....csv --limit 10
 *
 * Requer .env com NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e RESEND (para e-mails).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createAdminClient } from "../src/lib/supabase/admin";
import { provisionKiwifyOrder } from "../src/lib/kiwify/provision-access";
import type { KiwifyOrderWebhook } from "../src/lib/kiwify/types";
import {
  matchCsvProductToMapping,
  type KiwifyMappingForMatch,
} from "../src/lib/kiwify/match-csv-product-mapping";

function loadEnvFile() {
  for (const name of [".env.local", ".env"]) {
    const envPath = resolve(process.cwd(), name);
    try {
      const raw = readFileSync(envPath, "utf8");
      for (const line of raw.split(/\r?\n/)) {
        if (!line || line.startsWith("#")) continue;
        const index = line.indexOf("=");
        if (index < 0) continue;
        const key = line.slice(0, index).trim();
        let value = line.slice(index + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      /* arquivo opcional */
    }
  }
}

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

type CsvSaleRow = {
  orderId: string;
  status: string;
  productName: string;
  customerName: string;
  email: string;
  cpf: string;
};

function parseSalesCsv(filePath: string): CsvSaleRow[] {
  const content = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const rows: CsvSaleRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 5) continue;

    const orderId = cols[0]?.trim();
    const status = cols[1]?.trim().toLowerCase();
    const productName = cols[2]?.trim();
    const customerName = cols[3]?.trim();
    const email = cols[4]?.trim().toLowerCase();
    const cpf = (cols[5] ?? "").replace(/\D/g, "");

    if (!orderId || !email || !productName) continue;

    rows.push({
      orderId,
      status,
      productName,
      customerName,
      email,
      cpf,
    });
  }

  return rows;
}

function sleep(ms: number) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function loadMappings(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin
    .from("kiwify_product_mappings")
    .select(
      "kiwify_product_id, kiwify_product_name, edital_id, correction_quota, is_active, editais(title)",
    );

  if (error) {
    throw new Error(`Não foi possível carregar mapeamentos: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const edital = Array.isArray(row.editais) ? row.editais[0] : row.editais;
    return {
      kiwify_product_id: row.kiwify_product_id,
      kiwify_product_name: row.kiwify_product_name,
      edital_id: row.edital_id,
      correction_quota: row.correction_quota,
      is_active: row.is_active,
      edital_title: edital?.title ?? null,
    } satisfies KiwifyMappingForMatch;
  });
}

async function isOrderAlreadyLinked(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
) {
  const { data: event } = await admin
    .from("kiwify_order_events")
    .select("profile_id, enrollment_id")
    .eq("order_id", orderId)
    .maybeSingle();

  return Boolean(event?.profile_id && event?.enrollment_id);
}

async function clearUnlinkedOrderEvent(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
) {
  const { data: event } = await admin
    .from("kiwify_order_events")
    .select("id, profile_id, enrollment_id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!event) return;
  if (event.profile_id && event.enrollment_id) return;
  await admin.from("kiwify_order_events").delete().eq("order_id", orderId);
}

function buildWebhookPayload(row: CsvSaleRow, mapping: KiwifyMappingForMatch): KiwifyOrderWebhook {
  return {
    order_id: row.orderId,
    order_status: "paid",
    webhook_event_type: "compra_aprovada",
    Product: {
      product_id: mapping.kiwify_product_id,
      product_name: row.productName,
    },
    Customer: {
      full_name: row.customerName || "Aluno",
      email: row.email,
      CPF: row.cpf || undefined,
    },
  };
}

async function main() {
  loadEnvFile();

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;
  const csvPath = args.find((a) => !a.startsWith("--"));

  if (!csvPath) {
    console.error("Informe o caminho do CSV exportado da Kiwify.");
    process.exit(1);
  }

  const absoluteCsv = resolve(process.cwd(), csvPath);
  const allRows = parseSalesCsv(absoluteCsv);
  const paidRows = allRows.filter((row) => row.status === "paid");

  console.log(`CSV: ${absoluteCsv}`);
  console.log(`Linhas totais (sem cabeçalho): ${allRows.length}`);
  console.log(`Vendas pagas: ${paidRows.length}`);

  const admin = createAdminClient();
  const mappings = await loadMappings(admin);

  console.log(`Mapeamentos Kiwify ativos no banco: ${mappings.filter((m) => m.is_active).length}`);
  for (const m of mappings.filter((x) => x.is_active)) {
    console.log(`  · ${m.kiwify_product_name ?? m.kiwify_product_id} → ${m.edital_title ?? m.edital_id}`);
  }

  const toProcess: Array<{ row: CsvSaleRow; mapping: KiwifyMappingForMatch }> = [];
  const skippedNoMapping = new Map<string, number>();
  let skippedNoMappingCount = 0;
  let skippedAlreadyCount = 0;

  for (const row of paidRows) {
    const mapping = matchCsvProductToMapping(row.productName, mappings);
    if (!mapping) {
      skippedNoMappingCount += 1;
      skippedNoMapping.set(row.productName, (skippedNoMapping.get(row.productName) ?? 0) + 1);
      continue;
    }

    if (await isOrderAlreadyLinked(admin, row.orderId)) {
      skippedAlreadyCount += 1;
      continue;
    }

    toProcess.push({ row, mapping });
  }

  const limited = typeof limit === "number" && limit > 0 ? toProcess.slice(0, limit) : toProcess;

  console.log("\n--- Resumo antes de importar ---");
  console.log(`A processar (mapeados + pagos + não vinculados): ${limited.length}`);
  console.log(`Já vinculados (ignorados): ${skippedAlreadyCount}`);
  console.log(`Sem mapeamento de edital (ignorados): ${skippedNoMappingCount}`);

  if (skippedNoMapping.size) {
    console.log("\nProdutos ignorados (sem edital mapeado) — top 15:");
    const top = [...skippedNoMapping.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
    for (const [name, count] of top) {
      console.log(`  ${count}× ${name}`);
    }
  }

  if (dryRun) {
    console.log("\n[dry-run] Nenhuma alteração feita.");
    return;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY ausente.");
    process.exit(1);
  }

  let ok = 0;
  let fail = 0;
  let emailsSent = 0;
  let emailsFailed = 0;
  const errors: string[] = [];
  const emailErrors: string[] = [];

  for (const { row, mapping } of limited) {
    await clearUnlinkedOrderEvent(admin, row.orderId);
    const payload = buildWebhookPayload(row, mapping);
    const result = await provisionKiwifyOrder(payload);

    if (!result.ok) {
      fail += 1;
      if (errors.length < 20) {
        errors.push(`${row.orderId} (${row.email}): ${result.error}`);
      }
      continue;
    }

    if (result.skipped) {
      skippedAlreadyCount += 1;
      continue;
    }

    ok += 1;
    if (result.emailSent) {
      emailsSent += 1;
    } else {
      emailsFailed += 1;
      if (emailErrors.length < 15) {
        emailErrors.push(
          `${row.email}: ${result.reason ?? "e-mail não enviado"}`,
        );
      }
    }

    if (ok % 25 === 0) {
      console.log(`  … ${ok} provisionados (${emailsSent} e-mails ok)`);
    }

    await sleep(150);
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    console.warn(
      "\n⚠ RESEND_API_KEY não configurada — nenhum e-mail de acesso foi enviado.",
    );
  }

  console.log("\n--- Resultado ---");
  console.log(`Provisionados com sucesso: ${ok}`);
  console.log(`E-mails enviados: ${emailsSent}`);
  console.log(`E-mails com falha: ${emailsFailed}`);
  console.log(`Falhas de provisionamento: ${fail}`);
  console.log(`Ignorados (já existiam): ${skippedAlreadyCount}`);
  if (emailErrors.length) {
    console.log("\nPrimeiras falhas de e-mail:");
    for (const line of emailErrors) console.log(`  ${line}`);
  }
  if (errors.length) {
    console.log("\nPrimeiras falhas:");
    for (const line of errors) console.log(`  ${line}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
