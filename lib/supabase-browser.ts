import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para o BROWSER que guarda a sessão em cookies (compatível
 * com o middleware). Usado no login por passkey para trocar o token por sessão.
 */
export function criarClienteBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
}
