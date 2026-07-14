import { comTratamentoDeErro, ok, erro } from "@/lib/http";
import { buscarProduto } from "@/lib/mercos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/mercos/produtos/[id]
 * Busca UM produto ao vivo (preço/estoque do momento). O `id` é lido do path
 * para manter a assinatura padrão do wrapper de tratamento de erro.
 */
export const GET = comTratamentoDeErro(async (req) => {
  const segmentos = new URL(req.url).pathname.split("/");
  const id = segmentos[segmentos.length - 1] ?? "";
  if (id.trim().length === 0) {
    return erro("ID do produto ausente.", 400);
  }
  const produto = await buscarProduto(id);
  return ok({ produto, ao_vivo: true });
});
