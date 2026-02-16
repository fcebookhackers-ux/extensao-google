-- Add transformation + conditions flags/fields to webhooks
ALTER TABLE public.webhooks
  ADD COLUMN IF NOT EXISTS enable_transformation BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transformation_script TEXT NULL,
  ADD COLUMN IF NOT EXISTS enable_conditions BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS conditions JSONB NULL;

-- Conditions table
CREATE TABLE IF NOT EXISTS public.webhook_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  field_path TEXT NOT NULL,
  operator TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  logic_operator TEXT NOT NULL DEFAULT 'AND',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conditions_webhook ON public.webhook_conditions(webhook_id);

-- RLS
ALTER TABLE public.webhook_conditions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage conditions of own webhooks" ON public.webhook_conditions;
CREATE POLICY "Users can manage conditions of own webhooks"
  ON public.webhook_conditions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.webhooks w
      WHERE w.id = webhook_conditions.webhook_id
        AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.webhooks w
      WHERE w.id = webhook_conditions.webhook_id
        AND w.user_id = auth.uid()
    )
  );

-- Evaluate conditions (security definer, read-only)
CREATE OR REPLACE FUNCTION public.evaluate_webhook_conditions(
  p_webhook_id UUID,
  p_payload JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_condition RECORD;
  v_field_value TEXT;
  v_result BOOLEAN := true;
  v_current_result BOOLEAN;
  v_previous_logic TEXT := 'AND';
BEGIN
  FOR v_condition IN
    SELECT * FROM public.webhook_conditions
    WHERE webhook_id = p_webhook_id
    ORDER BY position
  LOOP
    BEGIN
      v_field_value := p_payload #>> string_to_array(v_condition.field_path, '.');
    EXCEPTION WHEN OTHERS THEN
      v_field_value := NULL;
    END;

    v_current_result := CASE v_condition.operator
      WHEN 'equals' THEN v_field_value = v_condition.value
      WHEN 'not_equals' THEN v_field_value IS DISTINCT FROM v_condition.value
      WHEN 'greater_than' THEN (NULLIF(v_field_value,'')::numeric > NULLIF(v_condition.value,'')::numeric)
      WHEN 'less_than' THEN (NULLIF(v_field_value,'')::numeric < NULLIF(v_condition.value,'')::numeric)
      WHEN 'greater_or_equal' THEN (NULLIF(v_field_value,'')::numeric >= NULLIF(v_condition.value,'')::numeric)
      WHEN 'less_or_equal' THEN (NULLIF(v_field_value,'')::numeric <= NULLIF(v_condition.value,'')::numeric)
      WHEN 'contains' THEN COALESCE(v_field_value,'') LIKE '%' || v_condition.value || '%'
      WHEN 'not_contains' THEN COALESCE(v_field_value,'') NOT LIKE '%' || v_condition.value || '%'
      WHEN 'starts_with' THEN COALESCE(v_field_value,'') LIKE v_condition.value || '%'
      WHEN 'ends_with' THEN COALESCE(v_field_value,'') LIKE '%' || v_condition.value
      WHEN 'matches_regex' THEN COALESCE(v_field_value,'') ~ v_condition.value
      WHEN 'is_empty' THEN v_field_value IS NULL OR v_field_value = ''
      WHEN 'is_not_empty' THEN v_field_value IS NOT NULL AND v_field_value <> ''
      ELSE false
    END;

    IF v_previous_logic = 'AND' THEN
      v_result := v_result AND v_current_result;
    ELSIF v_previous_logic = 'OR' THEN
      v_result := v_result OR v_current_result;
    END IF;

    v_previous_logic := v_condition.logic_operator;
  END LOOP;

  RETURN v_result;
END;
$$;