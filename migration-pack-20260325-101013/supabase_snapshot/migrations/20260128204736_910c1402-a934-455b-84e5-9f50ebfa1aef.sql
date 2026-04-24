-- RBAC robusto: permissões + role_permissions + função check_permission + RLS em automations

-- 0) Garantir extensões básicas (gen_random_uuid já é usado, então presume-se pgcrypto habilitado no projeto)

-- 1) Criar enum permission_type (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'permission_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.permission_type AS ENUM (
      'automations.create',
      'automations.edit',
      'automations.delete',
      'automations.publish',
      'contacts.import',
      'contacts.export',
      'contacts.delete',
      'team.invite',
      'team.remove',
      'billing.manage',
      'billing.view',
      'analytics.view',
      'settings.manage'
    );
  END IF;
END $$;

-- 2) Criar tabela role_permissions (idempotente)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission public.permission_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role, permission)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);

-- Habilitar RLS (boa prática) e restringir gerenciamento a admin
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas (se existirem) para evitar duplicidade
DROP POLICY IF EXISTS "Admins can manage role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can read role permissions" ON public.role_permissions;

-- Admin pode ler e gerenciar (INSERT/UPDATE/DELETE)
CREATE POLICY "Admins can read role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage role permissions"
ON public.role_permissions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) Inserir permissões padrão (admin e user) de forma idempotente
INSERT INTO public.role_permissions (role, permission)
SELECT v.role::public.app_role, v.permission::public.permission_type
FROM (
  VALUES
    -- Admin: todas
    ('admin', 'automations.create'),
    ('admin', 'automations.edit'),
    ('admin', 'automations.delete'),
    ('admin', 'automations.publish'),
    ('admin', 'contacts.import'),
    ('admin', 'contacts.export'),
    ('admin', 'contacts.delete'),
    ('admin', 'team.invite'),
    ('admin', 'team.remove'),
    ('admin', 'billing.manage'),
    ('admin', 'billing.view'),
    ('admin', 'analytics.view'),
    ('admin', 'settings.manage'),

    -- User: básicas
    ('user', 'automations.create'),
    ('user', 'automations.edit'),
    ('user', 'contacts.import'),
    ('user', 'analytics.view'),
    ('user', 'billing.view')
) AS v(role, permission)
ON CONFLICT (role, permission) DO NOTHING;

-- 4) Função check_permission (SQL, SECURITY DEFINER, sem recursão)
-- Observação: ela lê user_roles e role_permissions; como é SECURITY DEFINER, não depende de políticas RLS de role_permissions.
CREATE OR REPLACE FUNCTION public.check_permission(required_permission public.permission_type)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp
      ON rp.role = ur.role
    WHERE ur.user_id = auth.uid()
      AND rp.permission = required_permission
  );
$$;

-- 5) Atualizar políticas RLS da tabela automations
-- Garantir RLS habilitado
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas conhecidas (variações de nomes)
DROP POLICY IF EXISTS "Users can view own automations" ON public.automations;
DROP POLICY IF EXISTS "Users can insert own automations" ON public.automations;
DROP POLICY IF EXISTS "Users can update own automations" ON public.automations;
DROP POLICY IF EXISTS "Users can delete own automations" ON public.automations;

DROP POLICY IF EXISTS "Users can view their automations" ON public.automations;
DROP POLICY IF EXISTS "Users can create their automations" ON public.automations;
DROP POLICY IF EXISTS "Users can update their automations" ON public.automations;
DROP POLICY IF EXISTS "Users can delete their automations" ON public.automations;

DROP POLICY IF EXISTS "Users can create automations with permission" ON public.automations;
DROP POLICY IF EXISTS "Users can update own automations with permission" ON public.automations;
DROP POLICY IF EXISTS "Users can delete own automations with permission" ON public.automations;

-- SELECT: mantém escopo por dono (como no seu exemplo)
CREATE POLICY "Users can view own automations"
ON public.automations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: precisa permissão + user_id do dono
CREATE POLICY "Users can create automations with permission"
ON public.automations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.check_permission('automations.create'::public.permission_type)
);

-- UPDATE: precisa permissão + dono
CREATE POLICY "Users can update own automations with permission"
ON public.automations
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND public.check_permission('automations.edit'::public.permission_type)
)
WITH CHECK (
  auth.uid() = user_id
  AND public.check_permission('automations.edit'::public.permission_type)
);

-- DELETE: precisa permissão + dono
CREATE POLICY "Users can delete own automations with permission"
ON public.automations
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND public.check_permission('automations.delete'::public.permission_type)
);
