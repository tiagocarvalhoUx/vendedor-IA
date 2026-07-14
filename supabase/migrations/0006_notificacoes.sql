-- ════════════════════════════════════════════════════════════════════════
-- 0006 · Notificações — alerta quando uma venda é finalizada (faturado)
-- ════════════════════════════════════════════════════════════════════════
-- Um trigger em `pedidos` grava uma notificação sempre que um pedido chega
-- ao status 'faturado' (por qualquer vendedor de IA). O painel consome via
-- polling (service role), mostra toast + atualiza o sino.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists notificacoes (
  id         uuid primary key default gen_random_uuid(),
  tipo       text not null default 'venda_finalizada',
  titulo     text not null,
  mensagem   text not null,
  pedido_id  uuid references pedidos (id) on delete set null,
  valor      numeric(12,2),
  lida       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notificacoes_nao_lidas
  on notificacoes (lida, created_at desc);

-- RLS (consistente com as demais; escrita real é via service role / trigger).
alter table notificacoes enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='notificacoes' and policyname='notificacoes_sel') then
    create policy notificacoes_sel on notificacoes for select to authenticated using (true);
    create policy notificacoes_ins on notificacoes for insert to authenticated with check (true);
    create policy notificacoes_upd on notificacoes for update to authenticated using (true) with check (true);
    create policy notificacoes_del on notificacoes for delete to authenticated using (true);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- Trigger: dispara ao INSERIR pedido já 'faturado' ou ao ATUALIZAR o status
-- de qualquer coisa → 'faturado'. Não duplica se já estava faturado.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function notificar_venda_finalizada()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_vendedor text;
  v_cliente  text;
begin
  if new.status = 'faturado'
     and (tg_op = 'INSERT' or old.status is distinct from 'faturado') then
    select nome into v_vendedor from vendedores_ia where id = new.vendedor_ia_id;
    select nome into v_cliente  from clientes      where id = new.cliente_id;

    insert into notificacoes (tipo, titulo, mensagem, pedido_id, valor)
    values (
      'venda_finalizada',
      'Venda finalizada 🎉',
      coalesce(v_vendedor, 'Agente') || ' fechou ' ||
        coalesce(new.mercos_pedido_id, 'um pedido') || ' para ' ||
        coalesce(v_cliente, 'cliente'),
      new.id,
      new.valor_total
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notificar_venda on pedidos;
create trigger trg_notificar_venda
  after insert or update of status on pedidos
  for each row
  execute function notificar_venda_finalizada();
