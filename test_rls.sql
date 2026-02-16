-- RLS Smoke Tests (Workspace model)
--
-- Como usar (Supabase SQL Editor):
-- 1) Rode a seção "SETUP" preenchendo os UUIDs.
-- 2) Rode os SELECTs para confirmar que as policies estão filtrando corretamente.
--
-- Importante:
-- - Em Supabase, muitas policies dependem de auth.uid() / JWT.
-- - No SQL Editor você pode SIMULAR um usuário autenticado ajustando as configs abaixo.
-- - Se alguma função (ex.: is_workspace_member/has_permission) depender de tabelas de membership,
--   garanta que o usuário de teste realmente esteja no workspace.

/* ==========================================================
   SETUP (PREENCHA)
   ========================================================== */

-- Usuário 1 (membro do workspace)
-- Substitua pelos UUIDs reais
-- Ex.: selecione um user_id de public.profiles
\set user_1 '00000000-0000-0000-0000-000000000000'
\set user_2 '00000000-0000-0000-0000-000000000000'
\set workspace_id '00000000-0000-0000-0000-000000000000'

-- Simula contexto do PostgREST/JWT
select
  set_config('request.jwt.claim.role', 'authenticated', true) as jwt_role,
  set_config('request.jwt.claim.sub', :'user_1', true) as jwt_sub;

/* ==========================================================
   1) CONTACTS
   ========================================================== */

-- Deve retornar apenas contacts do workspace onde user_1 tem permissão contacts.view
select count(*) as visible_contacts
from public.contacts
where workspace_id = :'workspace_id';

/* ==========================================================
   2) AUTOMATIONS
   ========================================================== */

select count(*) as visible_automations
from public.automations
where workspace_id = :'workspace_id';

/* ==========================================================
   3) WEBHOOKS (E VIEW automation_metrics)
   ========================================================== */

select count(*) as visible_webhooks
from public.webhooks
where workspace_id = :'workspace_id';

-- A view deve respeitar RLS via security_invoker=on
select count(*) as visible_automation_metrics
from public.automation_metrics;

/* ==========================================================
   4) Troca para USER_2 (esperado: números diferentes se não for membro)
   ========================================================== */

select
  set_config('request.jwt.claim.role', 'authenticated', true) as jwt_role,
  set_config('request.jwt.claim.sub', :'user_2', true) as jwt_sub;

select count(*) as visible_contacts_user_2
from public.contacts
where workspace_id = :'workspace_id';

select count(*) as visible_automations_user_2
from public.automations
where workspace_id = :'workspace_id';

select count(*) as visible_webhooks_user_2
from public.webhooks
where workspace_id = :'workspace_id';

/* ==========================================================
   Dicas de diagnóstico
   ========================================================== */
-- Se tudo retornar 0 inesperadamente:
-- - confirme que existem dados com workspace_id informado
-- - confirme membership do user_1 no workspace
-- - confirme que o papel do user_1 no workspace possui a permissão na workspace_has_permission
-- - confira se RLS está ENABLED na tabela (ALTER TABLE ... ENABLE ROW LEVEL SECURITY)
