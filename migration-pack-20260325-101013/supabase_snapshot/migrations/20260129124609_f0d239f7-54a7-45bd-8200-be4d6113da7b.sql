-- Auditoria: eventos de ações sensíveis

-- 1) Tabela de eventos de auditoria (NÃO usar FK em auth.users)
CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT
);

-- 2) Índices
CREATE INDEX IF NOT EXISTS idx_audit_user_created ON public.audit_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_events(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_events(created_at DESC);

-- 3) RLS
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seus eventos
DROP POLICY IF EXISTS "Users can view own audit events" ON public.audit_events;
CREATE POLICY "Users can view own audit events"
ON public.audit_events
FOR SELECT
USING (auth.uid() = user_id);

-- Admins podem ver todos os eventos (evita recursão usando função security definer existente)
DROP POLICY IF EXISTS "Admins can view all audit events" ON public.audit_events;
CREATE POLICY "Admins can view all audit events"
ON public.audit_events
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Nenhuma policy de INSERT/UPDATE/DELETE para usuários (somente via função SECURITY DEFINER)

-- 4) Função para registrar eventos de auditoria
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_user_agent TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.audit_events (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    ip_address,
    user_agent,
    session_id
  ) VALUES (
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    COALESCE(p_metadata, '{}'::jsonb),
    inet_client_addr(),
    p_user_agent,
    p_session_id
  )
  RETURNING id INTO event_id;

  RETURN event_id;
END;
$$;

-- 5) Trigger para auditar mudanças em automations
CREATE OR REPLACE FUNCTION public.audit_automation_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      'automation.created',
      'automation',
      NEW.id,
      jsonb_build_object('name', NEW.name)
    );

  ELSIF TG_OP = 'UPDATE' THEN
    -- Audita mudança de status
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM public.log_audit_event(
        'automation.status_changed',
        'automation',
        NEW.id,
        jsonb_build_object(
          'old_status', OLD.status,
          'new_status', NEW.status
        )
      );
    END IF;

    -- Audita renomeação (opcional, porém útil)
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      PERFORM public.log_audit_event(
        'automation.updated',
        'automation',
        NEW.id,
        jsonb_build_object(
          'field', 'name',
          'old', OLD.name,
          'new', NEW.name
        )
      );
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      'automation.deleted',
      'automation',
      OLD.id,
      jsonb_build_object('name', OLD.name)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS automation_audit_trigger ON public.automations;
CREATE TRIGGER automation_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.automations
FOR EACH ROW
EXECUTE FUNCTION public.audit_automation_changes();
