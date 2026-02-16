-- Add WhatsApp permission to enum (must be committed before use)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'permission_type'
      AND e.enumlabel = 'whatsapp.manage'
  ) THEN
    ALTER TYPE public.permission_type ADD VALUE 'whatsapp.manage';
  END IF;
END $$;