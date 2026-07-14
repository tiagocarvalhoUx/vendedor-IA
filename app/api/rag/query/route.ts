import { z } from "zod";
import { comTratamentoDeErro, ok } from "@/lib/http";
import { consultarRag, RESPOSTA_NAO_SEI } from "@/lib/rag";
import { serverEnv } from "@/lib/env";

// Route Handler server-only; nunca pré-renderizar (usa segredos + rede).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Corpo = z.object({
  pergunta: z.string().min(1, "Pergunta obrigatória."),
  clienteId: z.string().uuid().optional(),
  vendedorIaId: z.string().uuid().optional(),
  threshold: z.number().min(0).max(1).optional(),
});

/**
 * POST /api/rag/query
 * Retrieval + grounding anti-alucinação. Se não houver contexto acima do
 * threshold, devolve "não sei" e abre escalonamento automático (§5).
 */
export const POST = comTratamentoDeErro(async (req) => {
  const { pergunta, clienteId, vendedorIaId, threshold } = Corpo.parse(
    await req.json(),
  );

  const { resultado, escalonamentoId, trechos } = await consultarRag(
    pergunta,
    { clienteId, vendedorIaId },
    threshold ?? serverEnv.RAG_SCORE_THRESHOLD,
  );

  if (resultado.tipo === "nao_sei") {
    return ok({
      grounded: false,
      resposta: RESPOSTA_NAO_SEI,
      escalonamentoId,
      motivo: resultado.motivo,
      melhorSimilaridade: resultado.melhorSimilaridade,
    });
  }

  // Fundamentada: devolve as citações obrigatórias. A GERAÇÃO final da resposta
  // ao cliente (com um LLM) deve usar SOMENTE este contexto — nunca extrapolar.
  return ok({
    grounded: true,
    confianca: resultado.confianca,
    citacoes: resultado.citacoes,
    trechos,
  });
});
