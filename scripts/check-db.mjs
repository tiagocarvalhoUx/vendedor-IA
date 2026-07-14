// Verifica a conexão com o Supabase usando os valores do .env.local.
// Uso:  node --env-file=.env.local scripts/check-db.mjs
//   (ou)  npm run check:db

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

function estaPreenchido(v) {
  return typeof v === "string" && v.length > 0 && !v.startsWith("COLE_AQUI");
}

console.log("── Verificação Supabase ──");
console.log("URL:", url || "(vazio)");

let faltando = [];
if (!estaPreenchido(url)) faltando.push("NEXT_PUBLIC_SUPABASE_URL");
if (!estaPreenchido(anon)) faltando.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (!estaPreenchido(secret)) faltando.push("SUPABASE_SERVICE_ROLE_KEY");
if (faltando.length) {
  console.error("❌ Preencha no .env.local:", faltando.join(", "));
  process.exit(1);
}

// Usa a chave secreta (bypassa RLS) para contar os clientes.
const resp = await fetch(`${url}/rest/v1/clientes?select=count`, {
  headers: { apikey: secret, Authorization: `Bearer ${secret}`, Prefer: "count=exact" },
});

if (resp.status === 401) {
  console.error("❌ 401 Invalid API key — a chave secreta não pertence a este projeto (confira a URL e a Secret na MESMA página Settings → API).");
  process.exit(2);
}
if (resp.status === 404) {
  console.error("❌ 404 — conectou, mas a tabela 'clientes' não existe. Rode supabase/setup-completo.sql no SQL Editor.");
  process.exit(3);
}
if (!resp.ok) {
  console.error(`❌ HTTP ${resp.status}:`, (await resp.text()).slice(0, 200));
  process.exit(4);
}

const range = resp.headers.get("content-range"); // ex.: "0-0/6"
const total = range ? range.split("/")[1] : "?";
console.log(`✅ Conectado! Clientes na base: ${total}`);
console.log(total === "6" ? "✅ Dados de exemplo presentes. Pode rodar: npm run dev" : "ℹ️  Conectou, mas o nº de clientes é diferente de 6 (rode o setup-completo.sql se ainda não rodou).");
