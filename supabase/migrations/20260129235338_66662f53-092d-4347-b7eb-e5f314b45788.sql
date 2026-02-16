-- Adicionar RLS na tabela circuit_breaker_config (era a tabela sem RLS)
ALTER TABLE public.circuit_breaker_config ENABLE ROW LEVEL SECURITY;

-- Config é pública para leitura (todos podem ver configurações)
CREATE POLICY "Config is publicly readable"
  ON public.circuit_breaker_config FOR SELECT
  USING (true);