import { DashboardShell } from "@/components/layout/dashboard-shell";
import { criarClienteSSR } from "@/lib/supabase-ssr";

/**
 * Deriva o primeiro nome do operador logado:
 *  1) user_metadata.nome / full_name / name, se existir;
 *  2) senão, a parte antes do "@" do e-mail (sem números/pontos).
 * Ex.: "tiago_carvalho07@yahoo.com.br" → "Tiago".
 */
function nomeDoOperador(
  email: string | null | undefined,
  metadata: Record<string, unknown> | undefined,
): string {
  const doMeta = metadata?.nome ?? metadata?.full_name ?? metadata?.name;
  const bruto =
    typeof doMeta === "string" && doMeta.trim() !== ""
      ? doMeta.trim()
      : (email ?? "").split("@")[0] ?? "";
  const primeiro = bruto.split(/[\s._\-+]/).find((p) => p.replace(/[^\p{L}]/gu, "") !== "") ?? "";
  const soLetras = primeiro.replace(/[^\p{L}]/gu, "");
  if (soLetras === "") return "Operador";
  return soLetras.charAt(0).toUpperCase() + soLetras.slice(1).toLowerCase();
}

// Shell do painel (mobile-first). O sino de notificações se alimenta sozinho
// via /api/notificacoes (polling). Aqui buscamos só a sessão para saudar o
// operador logado pelo nome.
export default async function DashboardLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const supabase = criarClienteSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const operador = nomeDoOperador(user?.email, user?.user_metadata);

  return <DashboardShell operador={operador}>{children}</DashboardShell>;
}
