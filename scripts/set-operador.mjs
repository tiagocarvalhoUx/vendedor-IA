// Cria (ou atualiza a senha de) o usuário operador do painel.
// Lê OPERADOR_EMAIL e OPERADOR_SENHA do .env.local — NUNCA passe pelo chat.
// Uso: npm run set:operador   (depois apague as 2 linhas do .env.local)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.env.OPERADOR_EMAIL ?? "").trim();
const senha = process.env.OPERADOR_SENHA ?? "";

if (!url || !secret) {
  console.log("❌ Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}
if (!email || senha.length < 8) {
  console.log("❌ Defina no .env.local:\n   OPERADOR_EMAIL=\"voce@exemplo.com\"\n   OPERADOR_SENHA=\"sua-senha-com-8+-caracteres\"");
  process.exit(1);
}

const sb = createClient(url, secret, { auth: { persistSession: false } });

// Procura usuário existente com esse email (para atualizar a senha em vez de duplicar).
const { data: lista } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
const existente = lista?.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());

if (existente) {
  const { error } = await sb.auth.admin.updateUserById(existente.id, { password: senha, email_confirm: true });
  console.log(error ? "❌ ERRO: " + error.message : "✅ Senha atualizada para: " + email);
} else {
  const { error } = await sb.auth.admin.createUser({ email, password: senha, email_confirm: true });
  console.log(error ? "❌ ERRO: " + error.message : "✅ Operador criado: " + email);
}
console.log("🔒 Agora APAGUE as linhas OPERADOR_EMAIL e OPERADOR_SENHA do .env.local.");
