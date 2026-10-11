import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 0) continue;
    env[line.slice(0, index)] = line.slice(index + 1);
  }
  return env;
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;

const MEMBER_EMAIL = (env.TEST_MEMBER_EMAIL || "membro.teste@daygomes.com.br").trim().toLowerCase();
const MEMBER_PASSWORD = env.TEST_MEMBER_PASSWORD || "daygomes";
const MEMBER_NAME = env.TEST_MEMBER_FULL_NAME || "Membro Teste Day Gomes";
const MEMBER_CPF = (env.TEST_MEMBER_CPF || "11144477735").replace(/\D/g, "");

const EDITAL_TITLE = "Edital de Testes — Day Gomes 2026";

const CARGOS = [
  {
    name: "AGENTE ADMINISTRATIVO",
    vacancyCount: 10,
    phases: [
      { title: "Redação dissertativa", description: "Tema sobre ética no serviço público.", days: 30 },
      { title: "Estudo de caso", description: "Análise de situação administrativa.", days: 45 },
      { title: "Prova objetiva simulada", description: "Questões de conhecimentos gerais.", days: 60 },
      { title: "Entrevista gravada", description: "Apresentação pessoal em vídeo curto.", days: 75 },
    ],
  },
  {
    name: "TÉCNICO JUDICIÁRIO",
    vacancyCount: 8,
    phases: [
      { title: "Peça técnica", description: "Elaboração de documento processual.", days: 30 },
      { title: "Interpretação de texto", description: "Resumo e comentário crítico.", days: 45 },
      { title: "Atividade prática", description: "Exercício de rotina cartorária.", days: 60 },
      { title: "Revisão final", description: "Correção com base no feedback anterior.", days: 75 },
    ],
  },
  {
    name: "ANALISTA JUDICIÁRIO",
    vacancyCount: 5,
    phases: [
      { title: "Dissertação avançada", description: "Tema de direito administrativo.", days: 30 },
      { title: "Parecer técnico", description: "Opinião fundamentada sobre caso hipotético.", days: 45 },
      { title: "Mapa mental", description: "Síntese visual do edital estudado.", days: 60 },
      { title: "Simulado integrado", description: "Prova mista objetiva e discursiva.", days: 75 },
    ],
  },
];

if (!url || !serviceRole) {
  console.error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}

const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existingEdital } = await admin
  .from("editais")
  .select("id, title")
  .eq("title", EDITAL_TITLE)
  .maybeSingle();

if (existingEdital) {
  console.log("Edital de teste já existe:", existingEdital.id);
  console.log("Título:", existingEdital.title);
  process.exit(0);
}

const { data: edital, error: editalError } = await admin
  .from("editais")
  .insert({ title: EDITAL_TITLE, updated_at: new Date().toISOString() })
  .select("id")
  .single();

if (editalError || !edital) {
  console.error("Erro ao criar edital:", editalError?.message);
  process.exit(1);
}

const cargoIds = [];

for (const [cargoIndex, cargo] of CARGOS.entries()) {
  const { data: cargoRow, error: cargoError } = await admin
    .from("edital_cargos")
    .insert({
      edital_id: edital.id,
      name: cargo.name,
      vacancy_count: cargo.vacancyCount,
      sort_order: cargoIndex,
    })
    .select("id")
    .single();

  if (cargoError || !cargoRow) {
    console.error("Erro ao criar cargo:", cargoError?.message);
    process.exit(1);
  }

  cargoIds.push({ id: cargoRow.id, name: cargo.name });

  for (const [phaseIndex, phase] of cargo.phases.entries()) {
    const { error: phaseError } = await admin.from("edital_phases").insert({
      cargo_id: cargoRow.id,
      phase_number: phaseIndex + 1,
      title: phase.title,
      description: phase.description,
      deadline_at: addDays(phase.days),
      updated_at: new Date().toISOString(),
    });

    if (phaseError) {
      console.error("Erro ao criar fase:", phaseError.message);
      process.exit(1);
    }
  }
}

const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
let memberId = listed?.users?.find((user) => user.email?.toLowerCase() === MEMBER_EMAIL)?.id;

if (!memberId) {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: MEMBER_NAME,
      role: "membro",
      cpf: MEMBER_CPF,
    },
  });

  if (createError || !created.user) {
    console.error("Erro ao criar membro:", createError?.message);
    process.exit(1);
  }

  memberId = created.user.id;
}

const { error: profileError } = await admin.from("profiles").upsert(
  {
    id: memberId,
    email: MEMBER_EMAIL,
    full_name: MEMBER_NAME,
    role: "membro",
    cpf: MEMBER_CPF,
    banned: false,
    updated_at: new Date().toISOString(),
  },
  { onConflict: "id" },
);

if (profileError) {
  console.error("Erro no perfil do membro:", profileError.message);
  process.exit(1);
}

const enrollCargo = cargoIds[0];

const { data: enrollment, error: enrollError } = await admin
  .from("member_edital_enrollments")
  .insert({
    member_id: memberId,
    edital_id: edital.id,
    cargo_id: enrollCargo.id,
  })
  .select("id")
  .single();

if (enrollError) {
  if (enrollError.code === "23505") {
    console.log("Membro já vinculado ao edital.");
  } else {
    console.error("Erro ao vincular membro:", enrollError.message);
    process.exit(1);
  }
}

const enrollmentId = enrollment?.id;
if (enrollmentId) {
  const { data: phase1 } = await admin
    .from("edital_phases")
    .select("id")
    .eq("cargo_id", enrollCargo.id)
    .eq("phase_number", 1)
    .maybeSingle();

  if (phase1) {
    const { data: accessExists } = await admin
      .from("member_phase_access")
      .select("id")
      .eq("enrollment_id", enrollmentId)
      .eq("phase_id", phase1.id)
      .maybeSingle();

    if (!accessExists) {
      await admin.from("member_phase_access").insert({
        enrollment_id: enrollmentId,
        phase_id: phase1.id,
        unlocked_at: new Date().toISOString(),
      });
    }
  }
}

console.log("Edital de teste criado com sucesso.");
console.log("Edital ID:", edital.id);
console.log("Título:", EDITAL_TITLE);
console.log("Cargos:", cargoIds.map((c) => c.name).join(" · "));
console.log("Fases: 4 por cargo (12 no total)");
console.log("");
console.log("Membro de teste:");
console.log("E-mail:", MEMBER_EMAIL);
console.log("Senha:", MEMBER_PASSWORD);
console.log("Cargo vinculado:", enrollCargo.name);
console.log("Admin: vincule outros membros em /painel/admin/editais/" + edital.id);
