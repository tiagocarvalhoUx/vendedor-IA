import { comTratamentoDeErro, ok } from "@/lib/http";
import { marcarNotificacoesLidas } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/notificacoes/ler
 * Marca todas as notificações como lidas (chamado ao abrir o sino).
 */
export const POST = comTratamentoDeErro(async () => {
  await marcarNotificacoesLidas();
  return ok({ ok: true });
});
