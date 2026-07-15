import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";

type CookieParaSetar = { name: string; value: string; options?: CookieOptions };

/**
 * Cliente Supabase ligado aos cookies da requisição — usado em Server
 * Components e Server Actions para ler/gravar a SESSÃO do operador (Auth).
 * Diferente do `criarClienteServico` (service_role), este respeita a sessão.
 */
export function criarClienteSSR() {
  const cookieStore = cookies();
  return createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieParaSetar[]) {
          // Em Server Components o set pode falhar (só actions/route handlers
          // podem gravar cookies) — o middleware cuida do refresh, então ok.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* ignora em contexto somente-leitura */
          }
        },
      },
    },
  );
}
