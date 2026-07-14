import { comTratamentoDeErro, ok } from "@/lib/http";
import { listarProdutos } from "@/lib/mercos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/mercos/produtos
 * Proxy tipado do catálogo Mercos — preço/estoque SEMPRE ao vivo (§5),
 * nunca cacheado. Tokens ficam no servidor (§7).
 */
export const GET = comTratamentoDeErro(async () => {
  const produtos = await listarProdutos();
  return ok({ produtos, ao_vivo: true });
});
