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

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;

const email = (env.CORRETOR_EMAIL || "corretor@daygomes.com.br").trim().toLowerCase();
const fullName = (env.CORRETOR_FULL_NAME || "Corretor Day Gomes").trim();
const cpf = (env.CORRETOR_CPF || "39053344705").replace(/\D/g, "");
const password = env.CORRETOR_PASSWORD || "daygomes";

if (!url || !serviceRole) {
  console.error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}

const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existingProfile } = await admin
  .from("profiles")
  .select("id, email, role")
  .eq("email", email)
  .maybeSingle();

if (existingProfile?.role === "corretor") {
  console.log(`Corretor já existe (${email}).`);
  console.log(`Senha padrão do projeto: ${password} (se não foi alterada).`);
  process.exit(0);
}

const { data: cpfTaken } = await admin.from("profiles").select("id").eq("cpf", cpf).maybeSingle();

if (cpfTaken && cpfTaken.id !== existingProfile?.id) {
  console.error("CPF já usado por outro usuário. Defina CORRETOR_CPF no .env.");
  process.exit(1);
}

const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
const found = listed?.users?.find((user) => user.email?.toLowerCase() === email);

let userId = found?.id;

if (!userId) {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: "corretor",
      cpf,
    },
  });

  if (error || !created.user) {
    console.error("Erro ao criar corretor:", error?.message ?? "desconhecido");
    process.exit(1);
  }

  userId = created.user.id;
}

const { error: profileError } = await admin.from("profiles").upsert(
  {
    id: userId,
    email,
    full_name: fullName,
    role: "corretor",
    cpf,
    banned: false,
    updated_at: new Date().toISOString(),
  },
  { onConflict: "id" },
);

if (profileError) {
  console.error("Erro ao salvar perfil:", profileError.message);
  process.exit(1);
}

console.log("Corretor criado com sucesso.");
console.log(`E-mail: ${email}`);
console.log(`Senha: ${password}`);
console.log("Acesse: http://localhost:3000/login → menu Correções no painel.");
