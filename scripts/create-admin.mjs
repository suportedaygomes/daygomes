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

const email = (env.ADMIN_EMAIL || "admin@daygomes.com.br").trim().toLowerCase();
const fullName = (env.ADMIN_FULL_NAME || "Administrador Day Gomes").trim();
const cpf = (env.ADMIN_CPF || "52998224725").replace(/\D/g, "");
const password = env.ADMIN_PASSWORD || "daygomes";

if (!url || !serviceRole) {
  console.error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}

const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existingAdmins } = await admin
  .from("profiles")
  .select("id, email")
  .eq("role", "admin")
  .limit(1);

if (existingAdmins?.length) {
  console.log(`Já existe admin (${existingAdmins[0].email}). Nada a fazer.`);
  process.exit(0);
}

const { data: byEmail } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
const found = byEmail?.users?.find((user) => user.email?.toLowerCase() === email);

let userId = found?.id;

if (!userId) {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: "admin",
      cpf,
    },
  });

  if (error || !created.user) {
    console.error("Erro ao criar admin:", error?.message ?? "desconhecido");
    process.exit(1);
  }

  userId = created.user.id;
}

const { error: profileError } = await admin.from("profiles").upsert(
  {
    id: userId,
    email,
    full_name: fullName,
    role: "admin",
    cpf,
    banned: false,
    updated_at: new Date().toISOString(),
  },
  { onConflict: "id" },
);

if (profileError) {
  console.error("Erro ao salvar perfil admin:", profileError.message);
  process.exit(1);
}

console.log("Admin criado com sucesso.");
console.log(`E-mail: ${email}`);
console.log(`Senha: ${password}`);
