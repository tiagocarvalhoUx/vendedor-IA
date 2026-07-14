-- ═══════════════════════════════════════════════════════════════════════════
-- SETUP COMPLETO — Vendedor de IA · Unno Ambiental
-- ───────────────────────────────────────────────────────────────────────────
-- Cole TODO este arquivo no SQL Editor do seu projeto Supabase e clique em RUN.
-- É idempotente o suficiente para rodar num projeto novo/vazio.
-- Inclui: extensões, tabelas, wallet-lock, RLS, busca RAG, hardening e dados
-- de exemplo.  (Equivale às migrations 0001–0005 + seed.)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────── Extensões ───────────────
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ─────────────── Enums ───────────────
do $$ begin
  create type status_cliente        as enum ('frio', 'morno', 'quente');
exception when duplicate_object then null; end $$;
do $$ begin
  create type canal_interacao       as enum ('ligacao', 'whatsapp');
exception when duplicate_object then null; end $$;
do $$ begin
  create type sentimento_interacao  as enum ('positivo', 'neutro', 'negativo');
exception when duplicate_object then null; end $$;
do $$ begin
  create type status_vendedor_ia    as enum ('ativo', 'pausado', 'banido');
exception when duplicate_object then null; end $$;
do $$ begin
  create type status_pedido as enum (
    'rascunho','enviado_financeiro','aprovado',
    'aguardando_pagamento','pago','faturado','enviado');
exception when duplicate_object then null; end $$;
do $$ begin
  create type status_escalonamento  as enum ('aberto', 'resolvido');
exception when duplicate_object then null; end $$;
do $$ begin
  create type tipo_conhecimento     as enum ('manual', 'argumento', 'objecao');
exception when duplicate_object then null; end $$;

-- ─────────────── Tabelas ───────────────
create table if not exists vendedores_ia (
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
  constraint numero_whatsapp_unico unique (numero_whatsapp),
  constraint janela_valida check (horario_inicio < horario_fim)
);

create table if not exists clientes (
  id                     uuid primary key default gen_random_uuid(),
  mercos_id              text unique,
  nome                   text not null,
  empresa                text,
  telefone               text,
  whatsapp               text,
  status                 status_cliente not null default 'frio',
  intervalo_contato_dias integer not null default 30 check (intervalo_contato_dias > 0),
  ultimo_contato         timestamptz,
  vendedor_ia_id         uuid references vendedores_ia (id) on delete set null,
  preferencias           jsonb not null default '{}'::jsonb,
  opt_out                boolean not null default false,
  created_at             timestamptz not null default now()
);
create index if not exists idx_clientes_vendedor       on clientes (vendedor_ia_id);
create index if not exists idx_clientes_status         on clientes (status);
create index if not exists idx_clientes_ultimo_contato on clientes (ultimo_contato);
create index if not exists idx_clientes_wallet_ativo   on clientes (vendedor_ia_id)
  where vendedor_ia_id is not null;

create table if not exists base_conhecimento (
  id         uuid primary key default gen_random_uuid(),
  tipo       tipo_conhecimento not null default 'manual',
  praga      text, produto text, dosagem text, modo_uso text,
  conteudo   text not null,
  fonte      text not null,
  embedding  vector(1536),
  created_at timestamptz not null default now()
);

create table if not exists interacoes (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references clientes (id) on delete cascade,
  vendedor_ia_id uuid not null references vendedores_ia (id) on delete restrict,
  canal          canal_interacao not null,
  transcricao text, resumo text, sentimento sentimento_interacao,
  created_at     timestamptz not null default now()
);
create index if not exists idx_interacoes_cliente on interacoes (cliente_id, created_at desc);

create table if not exists pedidos (
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
create index if not exists idx_pedidos_status  on pedidos (status);
create index if not exists idx_pedidos_cliente on pedidos (cliente_id, created_at desc);

create table if not exists escalonamentos (
  id                 uuid primary key default gen_random_uuid(),
  cliente_id         uuid references clientes (id) on delete set null,
  vendedor_ia_id     uuid references vendedores_ia (id) on delete set null,
  pergunta           text not null,
  motivo             text not null,
  status             status_escalonamento not null default 'aberto',
  humano_responsavel text, resposta text,
  created_at         timestamptz not null default now()
);
create index if not exists idx_escalonamentos_status on escalonamentos (status, created_at desc);

-- ─────────────── Wallet lock (atômico) ───────────────
create or replace function atribuir_cliente(p_cliente_id uuid, p_vendedor_id uuid)
returns clientes language plpgsql
set search_path = public, pg_temp as $$
declare v_dono_atual uuid; v_cliente clientes;
begin
  select vendedor_ia_id into v_dono_atual from clientes where id = p_cliente_id for update;
  if not found then
    raise exception 'CLIENTE_INEXISTENTE: %', p_cliente_id using errcode = 'no_data_found';
  end if;
  if v_dono_atual is not null and v_dono_atual <> p_vendedor_id then
    raise exception 'WALLET_LOCK_CONFLICT: cliente % ja pertence a %', p_cliente_id, v_dono_atual
      using errcode = 'unique_violation';
  end if;
  update clientes set vendedor_ia_id = p_vendedor_id where id = p_cliente_id returning * into v_cliente;
  return v_cliente;
end; $$;

create or replace function liberar_cliente(p_cliente_id uuid)
returns clientes language plpgsql
set search_path = public, pg_temp as $$
declare v_cliente clientes;
begin
  update clientes set vendedor_ia_id = null where id = p_cliente_id returning * into v_cliente;
  if not found then
    raise exception 'CLIENTE_INEXISTENTE: %', p_cliente_id using errcode = 'no_data_found';
  end if;
  return v_cliente;
end; $$;

-- ─────────────── Busca RAG ───────────────
create index if not exists idx_base_conhecimento_embedding
  on base_conhecimento using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create or replace function match_base_conhecimento(
  p_query_embedding vector(1536), p_threshold float default 0.78, p_limite int default 5)
returns table (id uuid, tipo tipo_conhecimento, praga text, produto text, dosagem text,
               modo_uso text, conteudo text, fonte text, similaridade float)
language sql stable
set search_path = public, pg_temp as $$
  select bc.id, bc.tipo, bc.praga, bc.produto, bc.dosagem, bc.modo_uso, bc.conteudo, bc.fonte,
         1 - (bc.embedding <=> p_query_embedding) as similaridade
  from base_conhecimento bc
  where bc.embedding is not null
    and 1 - (bc.embedding <=> p_query_embedding) >= p_threshold
  order by bc.embedding <=> p_query_embedding
  limit p_limite;
$$;

-- ─────────────── RLS (todas as tabelas) ───────────────
alter table vendedores_ia     enable row level security;
alter table clientes          enable row level security;
alter table base_conhecimento enable row level security;
alter table interacoes        enable row level security;
alter table pedidos           enable row level security;
alter table escalonamentos    enable row level security;

do $$
declare t text; op text; nome text;
begin
  foreach t in array array['vendedores_ia','clientes','base_conhecimento','interacoes','pedidos','escalonamentos'] loop
    -- remove policies antigas (idempotência) e recria
    for nome in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy %I on %I', nome, t);
    end loop;
    execute format('create policy %I on %I for select to authenticated using (true);', t||'_sel', t);
    execute format('create policy %I on %I for insert to authenticated with check (true);', t||'_ins', t);
    execute format('create policy %I on %I for update to authenticated using (true) with check (true);', t||'_upd', t);
    execute format('create policy %I on %I for delete to authenticated using (true);', t||'_del', t);
  end loop;
end $$;

-- ─────────────── Dados de exemplo ───────────────
truncate escalonamentos, interacoes, pedidos, base_conhecimento, clientes, vendedores_ia restart identity cascade;

insert into vendedores_ia (nome, persona, numero_whatsapp, chip, ip, status) values
  ('Sofia (IA)', 'Consultora técnica, cordial e objetiva', '+5511990001111', 'chip-A', '187.10.0.11', 'ativo'),
  ('Bruno (IA)', 'Vendedor consultivo, foco em recompra',   '+5511990002222', 'chip-B', '187.10.0.12', 'ativo');

do $$
declare v_sofia uuid; v_bruno uuid; c1 uuid; c2 uuid; c3 uuid; c4 uuid; d int;
begin
  select id into v_sofia from vendedores_ia where nome = 'Sofia (IA)';
  select id into v_bruno from vendedores_ia where nome = 'Bruno (IA)';

  insert into clientes (mercos_id, nome, empresa, telefone, whatsapp, status, intervalo_contato_dias, ultimo_contato, vendedor_ia_id, opt_out) values
    ('MC-1001','João Ferreira','Dedetizadora Praga Zero','11 3000-1001','5511990010001','quente',30, now()-interval '35 days', v_sofia,false),
    ('MC-1002','Marina Alves','ControlPest Ltda','11 3000-1002','5511990010002','morno',30, now()-interval '12 days', v_sofia,false),
    ('MC-1003','Carlos Souza','Imuniza Ambiental','11 3000-1003','5511990010003','quente',45, now()-interval '60 days', v_bruno,false),
    ('MC-1004','Patrícia Lima','BioControle Sul','11 3000-1004','5511990010004','frio',30, null, v_bruno,false),
    ('MC-1005','Rafael Nunes','Sanitiza Já','11 3000-1005','5511990010005','morno',30, now()-interval '5 days', v_sofia,true),
    ('MC-1006','Denis Prado','Pragmax Distribuidora','11 3000-1006','5511990010006','frio',30, null, null,false);

  select id into c1 from clientes where mercos_id='MC-1001';
  select id into c2 from clientes where mercos_id='MC-1002';
  select id into c3 from clientes where mercos_id='MC-1003';
  select id into c4 from clientes where mercos_id='MC-1004';

  insert into base_conhecimento (tipo, praga, produto, dosagem, modo_uso, conteudo, fonte) values
    ('manual','Barata','Gel Cimexa','2 pontos por m²','Aplicar em frestas e rodapés',
     'Para infestação de baratas em cozinha comercial, aplicar 2 pontos de gel por metro quadrado em frestas.','Manual Unno §3.1'),
    ('manual','Cupim','Termidor SC','Diluição 1:100','Barreira química no solo',
     'Cupim subterrâneo: barreira química perimetral com diluição 1:100, reforço a cada 60 meses.','Manual Unno §5.2'),
    ('objecao',null,null,null,null,
     'Quando o cliente diz que "está caro", reforçar custo por m² e garantia de reaplicação.','Playbook Comercial §2');

  insert into interacoes (cliente_id, vendedor_ia_id, canal, resumo, sentimento) values
    (c1, v_sofia,'whatsapp','Cliente pediu reposição de gel para praça de alimentação.','positivo'),
    (c2, v_sofia,'ligacao','Dúvida sobre prazo de entrega; encaminhado ao financeiro.','neutro'),
    (c3, v_bruno,'whatsapp','Reclamou de atraso na última entrega.','negativo');

  insert into pedidos (cliente_id, vendedor_ia_id, mercos_pedido_id, status, itens, valor_total, frete) values
    (c1, v_sofia,'PED-9001','faturado',            '[{"mercos_produto_id":"P1","descricao":"Gel Cimexa 30g","quantidade":40,"preco_unitario":180}]'::jsonb,15200,200),
    (c2, v_sofia,'PED-9002','aguardando_pagamento','[{"mercos_produto_id":"P2","descricao":"Termidor SC 1L","quantidade":10,"preco_unitario":950}]'::jsonb,12000,150),
    (c3, v_bruno,'PED-9003','aprovado',            '[{"mercos_produto_id":"P3","descricao":"Iscas formicida","quantidade":100,"preco_unitario":85}]'::jsonb,18500,300),
    (c1, v_sofia,'PED-9004','pago',                '[{"mercos_produto_id":"P1","descricao":"Gel Cimexa 30g","quantidade":30,"preco_unitario":180}]'::jsonb,16000,200),
    (c4, v_bruno,'PED-9005','rascunho',            '[{"mercos_produto_id":"P4","descricao":"Pulverizador 5L","quantidade":5,"preco_unitario":420}]'::jsonb,3200,100);

  insert into escalonamentos (cliente_id, vendedor_ia_id, pergunta, motivo, status) values
    (c3, v_bruno,'Qual a dosagem do Termidor para cupim de madeira seca?','Sem trecho acima do threshold no manual.','aberto'),
    (c2, v_sofia,'Posso aplicar o gel em ambiente com crianças?','Pergunta de segurança fora do contexto recuperado.','aberto'),
    (c1, v_sofia,'Vocês entregam no interior de MG?','Fora do domínio de produto.','resolvido');

  -- ── Faturamento espalhado pelo MÊS ATUAL (1 pedido/dia até hoje) → gráficos cheios ──
  for d in 1..extract(day from now())::int loop
    insert into pedidos (cliente_id, vendedor_ia_id, mercos_pedido_id, status, itens, valor_total, frete, created_at)
    values (
      (array[c1,c2,c3,c4])[1 + (d % 4)],
      case when d % 2 = 0 then v_sofia else v_bruno end,
      'SEED-C' || d,
      'faturado',
      '[]'::jsonb,
      round((1500 + random() * 3500)::numeric, 2),
      0,
      date_trunc('month', now()) + ((d - 1) || ' days')::interval + interval '10 hours'
    );
  end loop;

  -- ── MÊS ANTERIOR (base menor) → variações "vs mês anterior" reais e positivas ──
  for d in 1..28 loop
    if d % 2 = 0 then
      insert into pedidos (cliente_id, vendedor_ia_id, mercos_pedido_id, status, itens, valor_total, frete, created_at)
      values (
        (array[c1,c2,c3,c4])[1 + (d % 4)],
        v_sofia,
        'SEED-A' || d,
        'faturado',
        '[]'::jsonb,
        round((700 + random() * 1500)::numeric, 2),
        0,
        date_trunc('month', now() - interval '1 month') + ((d - 1) || ' days')::interval + interval '10 hours'
      );
    end if;
  end loop;
end $$;

-- Confirmação
select
  (select count(*) from vendedores_ia)    as vendedores,
  (select count(*) from clientes)          as clientes,
  (select count(*) from pedidos)           as pedidos,
  (select count(*) from escalonamentos)    as escalonamentos,
  (select count(*) from base_conhecimento) as conhecimento,
  (select count(*) from interacoes)        as interacoes;
