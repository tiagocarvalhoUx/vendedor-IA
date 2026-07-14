import { comTratamentoDeErro, ok } from "@/lib/http";
import { listarNotificacoes } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/notificacoes
 * Retorna as últimas notificações + total não lidas. O painel faz polling
 * aqui a cada ~15s para atualizar o sino e disparar toasts de venda finalizada.
 */
export const GET = comTratamentoDeErro(async () => {
  const { itens, naoLidas } = await listarNotificacoes();
  return ok({ itens, naoLidas });
});
