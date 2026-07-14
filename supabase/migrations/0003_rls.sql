-- ════════════════════════════════════════════════════════════════════════
-- 0003 · Row Level Security (RLS) — obrigatório em TODAS as tabelas (§5)
-- ════════════════════════════════════════════════════════════════════════
-- Modelo Fase 1: operador único autenticado (Marcio, "fiscal de robôs").
-- Toda a orquestração server-side usa a service_role, que BYPASSA RLS por
-- design — por isso as policies abaixo liberam leitura/escrita a usuários
-- autenticados e negam tudo ao papel `anon`. Quando entrar multi-operador
-- (Fase 2), trocamos por policies baseadas em org_id/tenant.
-- ════════════════════════════════════════════════════════════════════════

alter table vendedores_ia      enable row level security;
alter table clientes           enable row level security;
alter table base_conhecimento  enable row level security;
alter table interacoes         enable row level security;
alter table pedidos            enable row level security;
alter table escalonamentos     enable row level security;

-- Helper: cria as 4 policies CRUD para o papel `authenticated`.
do $$
declare
  t text;
begin
  foreach t in array array[
    'vendedores_ia', 'clientes', 'base_conhecimento',
    'interacoes', 'pedidos', 'escalonamentos'
  ]
  loop
    execute format(
      'create policy %I on %I for select to authenticated using (true);',
      t || '_sel', t);
    execute format(
      'create policy %I on %I for insert to authenticated with check (true);',
      t || '_ins', t);
    execute format(
      'create policy %I on %I for update to authenticated using (true) with check (true);',
      t || '_upd', t);
    execute format(
      'create policy %I on %I for delete to authenticated using (true);',
      t || '_del', t);
  end loop;
end;
$$;

-- Observação: o papel `anon` não recebe nenhuma policy → acesso negado.
-- A chave anon no client só enxerga dados após login (authenticated).
