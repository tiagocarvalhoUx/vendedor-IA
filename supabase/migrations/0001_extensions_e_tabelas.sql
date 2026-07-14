-- ════════════════════════════════════════════════════════════════════════
-- 0001 · Extensões + tabelas do Vendedor de IA (Unno Ambiental)
-- ════════════════════════════════════════════════════════════════════════
-- Regra de ouro: preço/estoque NÃO moram aqui — vêm ao vivo do Mercos.
-- Este schema guarda apenas o que é do sistema: carteira, conhecimento,
-- interações, pedidos (espelho de status) e escalonamentos.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";  -- gen_random_uuid()
create extension if not exists "vector";    -- pgvector (embeddings RAG)

-- ─────────────────────────── Enums de domínio ───────────────────────────
create type status_cliente        as enum ('frio', 'morno', 'quente');
create type canal_interacao       as enum ('ligacao', 'whatsapp');
create type sentimento_interacao  as enum ('positivo', 'neutro', 'negativo');
create type status_vendedor_ia    as enum ('ativo', 'pausado', 'banido');
create type status_pedido         as enum (
  'rascunho', 'enviado_financeiro', 'aprovado',
  'aguardando_pagamento', 'pago', 'faturado', 'enviado'
);
create type status_escalonamento  as enum ('aberto', 'resolvido');
create type tipo_conhecimento     as enum ('manual', 'argumento', 'objecao');

-- ─────────────────────────── vendedores_ia ───────────────────────────
-- Cada IA é um "caminhão da frota": número, chip e IP próprios (§7).
create table vendedores_ia (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  persona         text not null default '',
  numero_whatsapp text not null,
  chip            text not null default '',
  ip              text not null default '',
  horario_inicio  time not null default '07:30',
  horario_fim     time not null default '18:00',
  status          status_vendedor_ia not null default 'ativo',
  created_at      timestamptz not null default now(),
  -- Nunca usar o número principal da empresa; número deve ser único por IA.
  constraint numero_whatsapp_unico unique (numero_whatsapp),
  constraint janela_valida check (horario_inicio < horario_fim)
);

-- ─────────────────────────── clientes ───────────────────────────
create table clientes (
  id                     uuid primary key default gen_random_uuid(),
  mercos_id              text unique,
  nome                   text not null,
  empresa                text,
  telefone               text,
  whatsapp               text,
  status                 status_cliente not null default 'frio',
  intervalo_contato_dias integer not null default 30
                           check (intervalo_contato_dias > 0),
  ultimo_contato         timestamptz,
  -- WALLET LOCK: no máximo 1 vendedor ativo por cliente (0004 reforça atomicidade).
  vendedor_ia_id         uuid references vendedores_ia (id) on delete set null,
  preferencias           jsonb not null default '{}'::jsonb,
  opt_out                boolean not null default false,  -- LGPD
  created_at             timestamptz not null default now()
);
create index idx_clientes_vendedor  on clientes (vendedor_ia_id);
create index idx_clientes_status    on clientes (status);
-- Suporta a busca do agendador por "próximo toque" (janela de 30 dias).
create index idx_clientes_ultimo_contato on clientes (ultimo_contato);

-- ─────────────────────────── base_conhecimento (RAG) ───────────────────────────
create table base_conhecimento (
  id         uuid primary key default gen_random_uuid(),
  tipo       tipo_conhecimento not null default 'manual',
  praga      text,
  produto    text,
  dosagem    text,
  modo_uso   text,
  conteudo   text not null,
  fonte      text not null,               -- citação obrigatória na resposta
  embedding  vector(1536),                -- OpenAI text-embedding-3-small
  created_at timestamptz not null default now()
);

-- ─────────────────────────── interacoes ───────────────────────────
create table interacoes (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references clientes (id) on delete cascade,
  vendedor_ia_id uuid not null references vendedores_ia (id) on delete restrict,
  canal          canal_interacao not null,
  transcricao    text,
  resumo         text,
  sentimento     sentimento_interacao,
  created_at     timestamptz not null default now()
);
create index idx_interacoes_cliente on interacoes (cliente_id, created_at desc);

-- ─────────────────────────── pedidos ───────────────────────────
-- Espelho de status do Mercos. itens.preco_unitario é snapshot de auditoria,
-- não fonte de verdade (o preço vivo continua no Mercos).
create table pedidos (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references clientes (id) on delete restrict,
  vendedor_ia_id   uuid not null references vendedores_ia (id) on delete restrict,
  mercos_pedido_id text unique,
  status           status_pedido not null default 'rascunho',
  itens            jsonb not null default '[]'::jsonb,
  valor_total      numeric(12,2) not null default 0,
  frete            numeric(12,2) not null default 0,
  created_at       timestamptz not null default now()
);
create index idx_pedidos_status  on pedidos (status);
create index idx_pedidos_cliente on pedidos (cliente_id, created_at desc);

-- ─────────────────────────── escalonamentos ───────────────────────────
-- Fila "não sei" para revisão humana (inbox do operador).
create table escalonamentos (
  id                 uuid primary key default gen_random_uuid(),
  cliente_id         uuid references clientes (id) on delete set null,
  vendedor_ia_id     uuid references vendedores_ia (id) on delete set null,
  pergunta           text not null,
  motivo             text not null,
  status             status_escalonamento not null default 'aberto',
  humano_responsavel text,
  resposta           text,
  created_at         timestamptz not null default now()
);
create index idx_escalonamentos_status on escalonamentos (status, created_at desc);
