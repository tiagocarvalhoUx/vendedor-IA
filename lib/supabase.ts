import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv, requireServerEnv } from "@/lib/env";

/**
 * Fábricas de clientes Supabase.
 *
 *  • `criarClienteServico()` — usa a service_role. SERVER-ONLY. Bypassa RLS.
 *    Só para orquestração de servidor (webhooks, agendador, wallet lock).
 *  • `criarClienteBrowser()` — usa a chave anon. Respeita RLS. Seguro no client.
 *
 * Nunca exponha a service_role no browser (§7). O tipo do banco é gerado por
 * `supabase gen types` e injetado depois; até lá usamos o client não-tipado
 * de forma controlada nas libs de servidor.
 */

let _servico: SupabaseClient | null = null;

/**
 * Fetch sem cache — o Next.js cacheia `fetch` por padrão, o que deixaria o
 * painel com dados velhos. Um painel operacional (faturamento, carteira,
 * pedidos) precisa SEMPRE de dados frescos, então forçamos `no-store`.
 */
const fetchSemCache: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store" });

/** Cliente com privilégio total — apenas em contexto de servidor confiável. */
export function criarClienteServico(): SupabaseClient {
  if (_servico === null) {
    _servico = createClient(
      publicEnv.NEXT_PUBLIC_SUPABASE_URL,
      requireServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: fetchSemCache },
      },
    );
  }
  return _servico;
}

/** Cliente público (RLS ativo) para uso em componentes/browser. */
export function criarClienteBrowser(): SupabaseClient {
  return createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
