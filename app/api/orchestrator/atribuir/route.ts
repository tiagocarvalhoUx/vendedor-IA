import { z } from "zod";
import { comTratamentoDeErro, ok } from "@/lib/http";
import { atribuirCliente } from "@/lib/wallet-lock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Corpo = z.object({
  clienteId: z.string().uuid(),
  vendedorIaId: z.string().uuid(),
});

/**
 * POST /api/orchestrator/atribuir
 * Atribui um cliente a um vendedor via wallet lock atômico. Conflito de
 * carteira → 409 (mapeado no wrapper de erro). Regra inegociável (§7).
 */
export const POST = comTratamentoDeErro(async (req) => {
  const { clienteId, vendedorIaId } = Corpo.parse(await req.json());
  await atribuirCliente(clienteId, vendedorIaId);
  return ok({ atribuido: true, clienteId, vendedorIaId });
});
