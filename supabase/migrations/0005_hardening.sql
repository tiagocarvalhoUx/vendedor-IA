-- ════════════════════════════════════════════════════════════════════════
-- 0005 · Hardening — fixa search_path das funções (advisor de segurança)
-- ════════════════════════════════════════════════════════════════════════
-- Sem search_path fixo, uma função pode ser sequestrada por objetos criados
-- em schemas no caminho de busca do chamador. Fixamos em `public` (+ pg_temp
-- por último) para todas as funções de negócio.
-- ════════════════════════════════════════════════════════════════════════

alter function atribuir_cliente(uuid, uuid)          set search_path = public, pg_temp;
alter function liberar_cliente(uuid)                 set search_path = public, pg_temp;
alter function match_base_conhecimento(vector, float, int)
                                                     set search_path = public, pg_temp;

-- Nota (aceito na Fase 1): as policies RLS usam USING(true)/WITH CHECK(true)
-- porque o modelo é de OPERADOR ÚNICO e toda a escrita de orquestração passa
-- pela service_role (que bypassa RLS). Ao entrar multi-operador (Fase 2),
-- trocar por policies baseadas em tenant/org_id.
