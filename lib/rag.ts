/**
 * Núcleo do RAG anti-alucinação — Unno Ambiental.
 *
 * Contrato (regra de ouro do domínio, §3 do prompt):
 *
 *   resposta = f(pergunta, contexto_recuperado)
 *   SE contexto_recuperado.score < THRESHOLD  →  "não sei" + escalonar
 *   NUNCA  →  gerar dosagem/recomendação fora do contexto recuperado
 *   SEMPRE →  anexar {fonte, trecho, id_manual} à resposta
 *
 * A DECISÃO (grounding) é uma função PURA — `avaliarGrounding` — testável sem
 * banco, sem rede. A ORQUESTRAÇÃO (embeddings + RPC no Supabase) fica em
 * `consultarRag`, que delega a decisão à função pura.
 */

// ─────────────────────────── Tipos do contrato ───────────────────────────

/** Trecho recuperado do banco, já com a similaridade calculada (0..1). */
export interface TrechoRecuperado {
  readonly id: string;
  readonly conteudo: string;
  readonly fonte: string;
  readonly similaridade: number;
  readonly praga?: string | null;
  readonly produto?: string | null;
  readonly dosagem?: string | null;
  readonly modo_uso?: string | null;
}

/** Citação anexada a toda resposta fundamentada (rastreabilidade). */
export interface Citacao {
  readonly id_manual: string;
  readonly fonte: string;
  readonly trecho: string;
  readonly similaridade: number;
}

/**
 * Resultado da avaliação de grounding. Só existe em dois estados:
 *  • `fundamentada`   → há contexto acima do threshold; responder com citações.
 *  • `nao_sei`        → sem contexto suficiente; NÃO responder, escalonar.
 */
export type ResultadoGrounding =
  | {
      readonly tipo: "fundamentada";
      readonly citacoes: readonly Citacao[];
      /** Maior similaridade encontrada (confiança da resposta). */
      readonly confianca: number;
    }
  | {
      readonly tipo: "nao_sei";
      readonly motivo: string;
      /** Melhor similaridade obtida (abaixo do threshold), para auditoria. */
      readonly melhorSimilaridade: number;
    };

/** Limiar padrão de similaridade — pode ser sobrescrito via env (RAG_SCORE_THRESHOLD). */
export const THRESHOLD_PADRAO = 0.78;

/** Mensagem canônica de recusa segura (nunca "melhor palpite"). */
export const RESPOSTA_NAO_SEI =
  "Não tenho essa informação confirmada no manual da Unno. " +
  "Vou encaminhar sua dúvida para um especialista humano.";

// ─────────────────────────── Núcleo puro ───────────────────────────

/**
 * Decide, de forma PURA e determinística, se há contexto suficiente para
 * responder. É o portão anti-alucinação: produto químico não admite chute.
 *
 * @param trechos   trechos recuperados (em qualquer ordem)
 * @param threshold limiar mínimo de similaridade [0..1]
 */
export function avaliarGrounding(
  trechos: readonly TrechoRecuperado[],
  threshold: number = THRESHOLD_PADRAO,
): ResultadoGrounding {
  const relevantes = trechos
    .filter((t) => Number.isFinite(t.similaridade) && t.similaridade >= threshold)
    .sort((a, b) => b.similaridade - a.similaridade);

  const melhorSimilaridade = trechos.reduce(
    (max, t) => (Number.isFinite(t.similaridade) ? Math.max(max, t.similaridade) : max),
    0,
  );

  if (relevantes.length === 0) {
    return {
      tipo: "nao_sei",
      motivo:
        `Nenhum trecho atingiu o limiar de ${threshold}. ` +
        `Melhor similaridade: ${melhorSimilaridade.toFixed(3)}.`,
      melhorSimilaridade,
    };
  }

  const citacoes: readonly Citacao[] = relevantes.map((t) => ({
    id_manual: t.id,
    fonte: t.fonte,
    trecho: t.conteudo,
    similaridade: t.similaridade,
  }));

  return {
    tipo: "fundamentada",
    citacoes,
    confianca: relevantes[0]!.similaridade,
  };
}

/**
 * Monta o bloco de contexto (grounded) que será entregue ao LLM gerador.
 * Retorna string vazia quando não há fundamento — o chamador NUNCA deve
 * gerar dosagem/recomendação sem esse contexto.
 */
export function montarContexto(resultado: ResultadoGrounding): string {
  if (resultado.tipo === "nao_sei") return "";
  return resultado.citacoes
    .map(
      (c, i) =>
        `[Fonte ${i + 1}: ${c.fonte} (id ${c.id_manual}, ` +
        `sim ${c.similaridade.toFixed(3)})]\n${c.trecho}`,
    )
    .join("\n\n");
}

// ─────────────────────────── Orquestração (impura) ───────────────────────────

/** Contexto opcional para registrar o escalonamento automático. */
export interface ContextoConsulta {
  readonly clienteId?: string | null;
  readonly vendedorIaId?: string | null;
}

/** Retorno de `consultarRag`: decisão de grounding + trechos brutos. */
export interface RespostaRag {
  readonly resultado: ResultadoGrounding;
  readonly trechos: readonly TrechoRecuperado[];
  /** Preenchido quando um escalonamento foi aberto automaticamente. */
  readonly escalonamentoId: string | null;
}

// Forma de linha retornada pela RPC match_base_conhecimento (0004).
interface LinhaMatch {
  id: string;
  praga: string | null;
  produto: string | null;
  dosagem: string | null;
  modo_uso: string | null;
  conteudo: string;
  fonte: string;
  similaridade: number;
}

/**
 * Fluxo completo do RAG: embedding da pergunta → busca vetorial no Supabase →
 * avaliação pura de grounding → escalonamento automático quando "não sei".
 *
 * SERVER-ONLY (usa embeddings + service_role). Import dinâmico das libs de
 * servidor para manter este módulo seguro em ambientes de teste do núcleo puro.
 */
export async function consultarRag(
  pergunta: string,
  contexto: ContextoConsulta = {},
  threshold: number = THRESHOLD_PADRAO,
): Promise<RespostaRag> {
  const { gerarEmbedding } = await import("@/lib/embeddings");
  const { criarClienteServico } = await import("@/lib/supabase");

  const embedding = await gerarEmbedding(pergunta);
  const supabase = criarClienteServico();

  const { data, error } = await supabase.rpc("match_base_conhecimento", {
    p_query_embedding: embedding,
    p_threshold: threshold,
    p_limite: 5,
  });
  if (error) {
    throw new Error(`Falha na busca vetorial (RAG): ${error.message}`);
  }

  const trechos: TrechoRecuperado[] = ((data ?? []) as LinhaMatch[]).map((l) => ({
    id: l.id,
    conteudo: l.conteudo,
    fonte: l.fonte,
    similaridade: l.similaridade,
    praga: l.praga,
    produto: l.produto,
    dosagem: l.dosagem,
    modo_uso: l.modo_uso,
  }));

  const resultado = avaliarGrounding(trechos, threshold);

  // Sem fundamento → abre escalonamento humano automaticamente (§5).
  let escalonamentoId: string | null = null;
  if (resultado.tipo === "nao_sei") {
    const { data: esc, error: escErr } = await supabase
      .from("escalonamentos")
      .insert({
        cliente_id: contexto.clienteId ?? null,
        vendedor_ia_id: contexto.vendedorIaId ?? null,
        pergunta,
        motivo: resultado.motivo,
        status: "aberto",
      })
      .select("id")
      .single();
    if (escErr) {
      throw new Error(`Falha ao abrir escalonamento: ${escErr.message}`);
    }
    escalonamentoId = (esc as { id: string }).id;
  }

  return { resultado, trechos, escalonamentoId };
}

// ─────────────────── Resposta de texto (WhatsApp / chat) ───────────────────

/** Resposta gerada para uma pergunta de texto. */
export type RespostaTexto =
  | { readonly tipo: "resposta"; readonly texto: string }
  | { readonly tipo: "escalar"; readonly motivo: string };

/**
 * Gera uma resposta ANTI-ALUCINAÇÃO para uma pergunta de texto, usando o
 * manual (base_conhecimento) como contexto. "RAG-lite": para uma base pequena,
 * injeta os trechos no prompt (sem embeddings) e instrui o LLM a responder
 * SOMENTE com base neles — se não houver base, devolve "escalar".
 *
 * SERVER-ONLY. Sem OPENAI_API_KEY, sempre escala (fallback seguro).
 */
export async function responderPergunta(pergunta: string): Promise<RespostaTexto> {
  const { serverEnv } = await import("@/lib/env");
  if (serverEnv.OPENAI_API_KEY === undefined) {
    return { tipo: "escalar", motivo: "IA de texto não configurada (sem OPENAI_API_KEY)." };
  }

  const { criarClienteServico } = await import("@/lib/supabase");
  const supabase = criarClienteServico();
  const { data } = await supabase
    .from("base_conhecimento")
    .select("praga, produto, dosagem, modo_uso, conteudo, fonte")
    .limit(50);

  type Item = {
    praga: string | null;
    produto: string | null;
    dosagem: string | null;
    modo_uso: string | null;
    conteudo: string;
    fonte: string;
  };
  const contexto = ((data ?? []) as Item[])
    .map(
      (b, i) =>
        `[${i + 1}] Fonte: ${b.fonte}\n` +
        `${[b.praga, b.produto, b.dosagem, b.modo_uso].filter(Boolean).join(" · ")}\n` +
        b.conteudo,
    )
    .join("\n\n");

  if (contexto.trim() === "") {
    return { tipo: "escalar", motivo: "Base de conhecimento vazia." };
  }

  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: serverEnv.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "Você é o VIA, vendedor virtual da Unno Ambiental (químicos para controle de pragas). " +
          "Responda à pergunta do cliente USANDO SOMENTE o CONTEXTO abaixo (manual da Unno). " +
          "Produto químico não admite chute: se a resposta NÃO estiver claramente no contexto, " +
          'responda EXATAMENTE a palavra "ESCALAR" e nada mais. NUNCA invente dosagem, praga ou ' +
          "recomendação. Seja breve, cordial e em português do Brasil.\n\nCONTEXTO:\n" +
          contexto,
      },
      { role: "user", content: pergunta },
    ],
  });

  const texto = completion.choices[0]?.message?.content?.trim() ?? "";
  if (texto === "" || texto.toUpperCase().replace(/[^A-Z]/g, "") === "ESCALAR") {
    return { tipo: "escalar", motivo: "Pergunta fora do manual." };
  }
  return { tipo: "resposta", texto };
}
