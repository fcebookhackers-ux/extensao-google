CREATE OR REPLACE FUNCTION public.block_immutable_audit_log_mutations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'immutable_audit_log is append-only (UPDATE blocked)';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'immutable_audit_log is append-only (DELETE blocked)';
  END IF;
  RETURN NULL;
END;
$$;