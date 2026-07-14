-- ════════════════════════════════════════════════════════════════════════
-- 0004 · Retrieval RAG — índice vetorial + função de similaridade
-- ════════════════════════════════════════════════════════════════════════
-- Anti-alucinação (§5): a busca retorna a similaridade (0..1) de cada trecho.
-- O threshold é aplicado na aplicação (lib/rag.ts) para decidir entre
-- responder com fundamento ou devolver "não sei" + escalonar.
-- ════════════════════════════════════════════════════════════════════════

-- Índice IVFFlat com distância de cosseno. `lists` ~ sqrt(nº de linhas);
-- 100 é um bom ponto de partida — reavaliar quando a base crescer.
create index if not exists idx_base_conhecimento_embedding
  on base_conhecimento
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ─────────────────────────────────────────────────────────────────────────
-- match_base_conhecimento(embedding, threshold, limite)
--   Retorna os trechos mais similares com `similaridade` = 1 - distância.
--   Filtra por threshold já no banco para não trafegar ruído.
--   `1 - (embedding <=> query)` converte distância de cosseno em similaridade.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function match_base_conhecimento(
  p_query_embedding vector(1536),
  p_threshold       float default 0.78,
  p_limite          int   default 5
)
returns table (
  id           uuid,
  tipo         tipo_conhecimento,
  praga        text,
  produto      text,
  dosagem      text,
  modo_uso     text,
  conteudo     text,
  fonte        text,
  similaridade float
)
language sql
stable
as $$
  select
    bc.id,
    bc.tipo,
    bc.praga,
    bc.produto,
    bc.dosagem,
    bc.modo_uso,
    bc.conteudo,
    bc.fonte,
    1 - (bc.embedding <=> p_query_embedding) as similaridade
  from base_conhecimento bc
  where bc.embedding is not null
    and 1 - (bc.embedding <=> p_query_embedding) >= p_threshold
  order by bc.embedding <=> p_query_embedding
  limit p_limite;
$$;
