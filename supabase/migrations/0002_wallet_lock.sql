-- ════════════════════════════════════════════════════════════════════════
-- 0002 · Wallet lock — carteira exclusiva por vendedor de IA
-- ════════════════════════════════════════════════════════════════════════
-- Regra inegociável (§7): duas IAs NUNCA falam com o mesmo cliente.
-- Como `clientes.vendedor_ia_id` é coluna única por linha, um cliente já tem
-- no máximo um vendedor. O risco real é a CORRIDA: duas atribuições
-- simultâneas. Resolvemos com uma função atômica que só atribui se o slot
-- estiver livre — a transação que chegar primeiro vence (§6 "corrida").
-- ════════════════════════════════════════════════════════════════════════

-- Índice parcial: acelera a checagem de clientes já com dono ativo.
create index if not exists idx_clientes_wallet_ativo
  on clientes (vendedor_ia_id)
  where vendedor_ia_id is not null;

-- ─────────────────────────────────────────────────────────────────────────
-- atribuir_cliente(cliente, vendedor)
--   Atribui o cliente ao vendedor SOMENTE se:
--     • o cliente ainda não tem dono, OU
--     • já é do mesmo vendedor (idempotente).
--   Caso contrário, levanta exceção 'WALLET_LOCK_CONFLICT'.
--   `for update` serializa corridas na linha do cliente.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function atribuir_cliente(
  p_cliente_id uuid,
  p_vendedor_id uuid
) returns clientes
language plpgsql
as $$
declare
  v_dono_atual uuid;
  v_cliente    clientes;
begin
  -- Trava a linha para serializar atribuições concorrentes.
  select vendedor_ia_id into v_dono_atual
  from clientes
  where id = p_cliente_id
  for update;

  if not found then
    raise exception 'CLIENTE_INEXISTENTE: %', p_cliente_id
      using errcode = 'no_data_found';
  end if;

  if v_dono_atual is not null and v_dono_atual <> p_vendedor_id then
    raise exception 'WALLET_LOCK_CONFLICT: cliente % já pertence a %',
      p_cliente_id, v_dono_atual
      using errcode = 'unique_violation';
  end if;

  update clientes
  set vendedor_ia_id = p_vendedor_id
  where id = p_cliente_id
  returning * into v_cliente;

  return v_cliente;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- liberar_cliente(cliente)
--   Solta o cliente da carteira (ex.: opt-out, inatividade, rebalanceamento).
-- ─────────────────────────────────────────────────────────────────────────
create or replace function liberar_cliente(p_cliente_id uuid)
returns clientes
language plpgsql
as $$
declare
  v_cliente clientes;
begin
  update clientes
  set vendedor_ia_id = null
  where id = p_cliente_id
  returning * into v_cliente;

  if not found then
    raise exception 'CLIENTE_INEXISTENTE: %', p_cliente_id
      using errcode = 'no_data_found';
  end if;

  return v_cliente;
end;
$$;
