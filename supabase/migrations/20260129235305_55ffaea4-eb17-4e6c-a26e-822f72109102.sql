-- Circuit Breaker pattern for webhook resilience

-- Estado do circuit breaker
CREATE TYPE public.circuit_breaker_state AS ENUM ('closed', 'open', 'half_open');

-- Tabela para rastrear estado do circuit breaker por webhook
CREATE TABLE public.webhook_circuit_breaker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  state public.circuit_breaker_state DEFAULT 'closed' NOT NULL,
  failure_count INTEGER DEFAULT 0 NOT NULL,
  success_count INTEGER DEFAULT 0 NOT NULL,
  last_failure_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  half_opened_at TIMESTAMPTZ,
  consecutive_failures INTEGER DEFAULT 0 NOT NULL,
  consecutive_successes INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT webhook_circuit_breaker_webhook_unique UNIQUE(webhook_id)
);

-- Índices para performance
CREATE INDEX idx_circuit_breaker_webhook ON public.webhook_circuit_breaker(webhook_id);
CREATE INDEX idx_circuit_breaker_state ON public.webhook_circuit_breaker(state);

-- RLS policies
ALTER TABLE public.webhook_circuit_breaker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own circuit breaker status"
  ON public.webhook_circuit_breaker FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.webhooks
      WHERE webhooks.id = webhook_circuit_breaker.webhook_id
      AND webhooks.user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER webhook_circuit_breaker_set_updated_at
  BEFORE UPDATE ON public.webhook_circuit_breaker
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Configuração global do circuit breaker
CREATE TABLE public.circuit_breaker_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  failure_threshold INTEGER DEFAULT 5 NOT NULL, -- Abrir após 5 falhas consecutivas
  success_threshold INTEGER DEFAULT 2 NOT NULL, -- Fechar após 2 sucessos em half_open
  open_timeout_seconds INTEGER DEFAULT 300 NOT NULL, -- 5 minutos em estado open
  half_open_max_calls INTEGER DEFAULT 3 NOT NULL, -- Máximo de 3 tentativas em half_open
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Inserir configuração padrão
INSERT INTO public.circuit_breaker_config (id) VALUES (gen_random_uuid());

-- Função para verificar se webhook pode ser executado
CREATE OR REPLACE FUNCTION public.can_execute_webhook(p_webhook_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_breaker RECORD;
  v_config RECORD;
BEGIN
  -- Buscar ou criar circuit breaker para o webhook
  INSERT INTO public.webhook_circuit_breaker (webhook_id)
  VALUES (p_webhook_id)
  ON CONFLICT (webhook_id) DO NOTHING;

  SELECT * INTO v_breaker
  FROM public.webhook_circuit_breaker
  WHERE webhook_id = p_webhook_id;

  SELECT * INTO v_config
  FROM public.circuit_breaker_config
  LIMIT 1;

  -- CLOSED: pode executar normalmente
  IF v_breaker.state = 'closed' THEN
    RETURN jsonb_build_object(
      'can_execute', true,
      'state', 'closed',
      'reason', null
    );
  END IF;

  -- OPEN: verificar se já passou o timeout para tentar half_open
  IF v_breaker.state = 'open' THEN
    IF NOW() - v_breaker.opened_at > INTERVAL '1 second' * v_config.open_timeout_seconds THEN
      -- Transição para HALF_OPEN
      UPDATE public.webhook_circuit_breaker
      SET 
        state = 'half_open',
        half_opened_at = NOW(),
        consecutive_successes = 0
      WHERE webhook_id = p_webhook_id;

      RETURN jsonb_build_object(
        'can_execute', true,
        'state', 'half_open',
        'reason', 'Transitioning to half-open state for testing'
      );
    ELSE
      RETURN jsonb_build_object(
        'can_execute', false,
        'state', 'open',
        'reason', 'Circuit breaker is OPEN due to too many failures'
      );
    END IF;
  END IF;

  -- HALF_OPEN: permitir tentativas limitadas
  IF v_breaker.state = 'half_open' THEN
    IF v_breaker.consecutive_successes < v_config.half_open_max_calls THEN
      RETURN jsonb_build_object(
        'can_execute', true,
        'state', 'half_open',
        'reason', 'Testing in half-open state'
      );
    ELSE
      RETURN jsonb_build_object(
        'can_execute', false,
        'state', 'half_open',
        'reason', 'Maximum test calls reached in half-open state'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('can_execute', false, 'state', 'unknown', 'reason', 'Unknown state');
END;
$$;

-- Função para registrar resultado de execução do webhook
CREATE OR REPLACE FUNCTION public.record_webhook_execution(
  p_webhook_id uuid,
  p_success boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
  v_breaker RECORD;
BEGIN
  SELECT * INTO v_config FROM public.circuit_breaker_config LIMIT 1;
  SELECT * INTO v_breaker FROM public.webhook_circuit_breaker WHERE webhook_id = p_webhook_id;

  IF p_success THEN
    -- SUCESSO
    IF v_breaker.state = 'closed' THEN
      -- Resetar contador de falhas
      UPDATE public.webhook_circuit_breaker
      SET 
        consecutive_failures = 0,
        last_success_at = NOW(),
        success_count = success_count + 1
      WHERE webhook_id = p_webhook_id;

    ELSIF v_breaker.state = 'half_open' THEN
      -- Incrementar sucessos consecutivos
      UPDATE public.webhook_circuit_breaker
      SET 
        consecutive_successes = consecutive_successes + 1,
        consecutive_failures = 0,
        last_success_at = NOW(),
        success_count = success_count + 1
      WHERE webhook_id = p_webhook_id;

      -- Se atingiu threshold, fechar circuit
      IF v_breaker.consecutive_successes + 1 >= v_config.success_threshold THEN
        UPDATE public.webhook_circuit_breaker
        SET 
          state = 'closed',
          consecutive_successes = 0
        WHERE webhook_id = p_webhook_id;
      END IF;
    END IF;

  ELSE
    -- FALHA
    UPDATE public.webhook_circuit_breaker
    SET 
      consecutive_failures = consecutive_failures + 1,
      consecutive_successes = 0,
      last_failure_at = NOW(),
      failure_count = failure_count + 1
    WHERE webhook_id = p_webhook_id;

    -- Se atingiu threshold, abrir circuit
    IF v_breaker.consecutive_failures + 1 >= v_config.failure_threshold THEN
      UPDATE public.webhook_circuit_breaker
      SET 
        state = 'open',
        opened_at = NOW()
      WHERE webhook_id = p_webhook_id;
    END IF;
  END IF;
END;
$$;