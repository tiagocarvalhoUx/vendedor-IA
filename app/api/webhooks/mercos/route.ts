import { z } from "zod";
import { comTratamentoDeErro, ok } from "@/lib/http";
import type { StatusPedido } from "@/types/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mapeia o status do Mercos para o nosso enum de pipeline (§9). Ajustar aos
// rótulos reais da conta Mercos quando o webhook for configurado.
const MAPA_STATUS: Record<string, StatusPedido> = {
  rascunho: "rascunho",
  enviado_financeiro: "enviado_financeiro",
  aprovado: "aprovado",
  aguardando_pagamento: "aguardando_pagamento",
  pago: "pago",
  faturado: "faturado",
  enviado: "enviado",
};

const Corpo = z.object({
  mercos_pedido_id: z.string().min(1),
  status: z.string().min(1),
});

/**
 * POST /api/webhooks/mercos
 * Recebe atualizações de status de pedido do Mercos e espelha no pipeline.
 * Sync unidirecional Mercos → painel (o outro sentido é feito ao criar pedido).
 */
export const POST = comTratamentoDeErro(async (req) => {
  const { mercos_pedido_id, status } = Corpo.parse(await req.json());

  const statusInterno = MAPA_STATUS[status];
  if (statusInterno === undefined) {
    return ok({ ignorado: true, motivo: `Status desconhecido: ${status}` }, 202);
  }

  const { criarClienteServico } = await import("@/lib/supabase");
  const supabase = criarClienteServico();

  const { data, error } = await supabase
    .from("pedidos")
    .update({ status: statusInterno })
    .eq("mercos_pedido_id", mercos_pedido_id)
    .select("id, status")
    .maybeSingle();

  if (error) throw new Error(`Falha ao atualizar pedido: ${error.message}`);
  if (data === null) {
    // Pedido ainda não espelhado no painel — aceita sem falhar (idempotência).
    return ok({ atualizado: false, motivo: "Pedido não encontrado." }, 202);
  }

  return ok({ atualizado: true, pedido: data });
});
