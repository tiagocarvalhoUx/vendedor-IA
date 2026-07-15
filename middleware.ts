import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieParaSetar = { name: string; value: string; options?: CookieOptions };

/**
 * Middleware de autenticação: refresca a sessão e protege as telas do painel.
 * Sem sessão → redireciona para /login. Só roda nas rotas do dashboard
 * (o matcher abaixo), deixando landing, /login, webhooks e /api públicos.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieParaSetar[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/overview/:path*",
    "/carteira/:path*",
    "/conversas/:path*",
    "/pedidos/:path*",
    "/base-conhecimento/:path*",
    "/escalonamentos/:path*",
    "/vendedores/:path*",
  ],
};
