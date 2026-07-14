import OpenAI from "openai";
import { requireServerEnv } from "@/lib/env";

/**
 * Geração de embeddings — SERVER-ONLY (usa OPENAI_API_KEY).
 *
 * Modelo: text-embedding-3-small (1536 dims) — casa com vector(1536) do schema.
 * Nunca importar em Client Components: a chave jamais pode chegar ao browser.
 */

export const MODELO_EMBEDDING = "text-embedding-3-small";
export const DIMENSAO_EMBEDDING = 1536;

let _client: OpenAI | null = null;

function client(): OpenAI {
  if (_client === null) {
    _client = new OpenAI({ apiKey: requireServerEnv("OPENAI_API_KEY") });
  }
  return _client;
}

/** Gera o embedding de um único texto (ex.: pergunta do cliente). */
export async function gerarEmbedding(texto: string): Promise<number[]> {
  const entrada = texto.trim();
  if (entrada.length === 0) {
    throw new Error("Texto vazio: não é possível gerar embedding.");
  }
  const resposta = await client().embeddings.create({
    model: MODELO_EMBEDDING,
    input: entrada,
  });
  const vetor = resposta.data[0]?.embedding;
  if (vetor === undefined || vetor.length !== DIMENSAO_EMBEDDING) {
    throw new Error(
      `Embedding inválido: esperado ${DIMENSAO_EMBEDDING} dims, ` +
        `recebido ${vetor?.length ?? 0}.`,
    );
  }
  return vetor;
}

/** Gera embeddings em lote (ingestão da base de conhecimento). */
export async function gerarEmbeddingsLote(
  textos: readonly string[],
): Promise<number[][]> {
  const entradas = textos.map((t) => t.trim()).filter((t) => t.length > 0);
  if (entradas.length === 0) return [];
  const resposta = await client().embeddings.create({
    model: MODELO_EMBEDDING,
    input: entradas,
  });
  return resposta.data.map((d) => d.embedding);
}
