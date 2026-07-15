-- ════════════════════════════════════════════════════════════════════════
-- 0007 · Passkeys (WebAuthn) — login biométrico (digital/Face ID)
-- ════════════════════════════════════════════════════════════════════════
-- Guarda as credenciais de passkey de cada operador (chave pública + contador).
-- A verificação biométrica acontece no dispositivo; o servidor só valida a
-- assinatura contra a chave pública aqui armazenada.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists credenciais_webauthn (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,   -- base64url
  public_key    text not null,          -- base64url da chave pública
  counter       bigint not null default 0,
  transports    text[],
  apelido       text,                    -- ex.: "iPhone do Marcio"
  created_at    timestamptz not null default now()
);
create index if not exists idx_webauthn_user on credenciais_webauthn(user_id);

alter table credenciais_webauthn enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='credenciais_webauthn' and policyname='webauthn_sel') then
    create policy webauthn_sel on credenciais_webauthn for select to authenticated using (auth.uid() = user_id);
    create policy webauthn_ins on credenciais_webauthn for insert to authenticated with check (auth.uid() = user_id);
    create policy webauthn_upd on credenciais_webauthn for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy webauthn_del on credenciais_webauthn for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;
