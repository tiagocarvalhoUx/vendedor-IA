import { comTratamentoDeErro, ok } from "@/lib/http";
import { listarElegiveisParaToque } from "@/lib/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/orchestrator/elegiveis
 * Fila de clientes que PODEM ser contatados agora: dentro da janela do
 * vendedor, com toque vencido e sem opt-out (§5). O disparo em si (Twilio/
 * WhatsApp) é orquestrado à parte, em ritmo humano (§7).
 */
export const GET = comTratamentoDeErro(async () => {
  const elegiveis = await listarElegiveisParaToque(new Date());
  return ok({ total: elegiveis.length, elegiveis });
});
