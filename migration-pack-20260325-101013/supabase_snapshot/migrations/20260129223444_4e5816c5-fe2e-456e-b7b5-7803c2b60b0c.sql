-- Fix: Postgres não suporta CREATE POLICY IF NOT EXISTS em algumas versões.

-- Garantir tabela
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  direction text NOT NULL DEFAULT 'outbound',
  content text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT messages_direction_valid CHECK (direction IN ('inbound','outbound')),
  CONSTRAINT messages_status_valid CHECK (status IN ('queued','sent','delivered','read','failed')),
  CONSTRAINT messages_contact_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_user_contact_created_at
  ON public.messages(user_id, contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_contact_created_at
  ON public.messages(contact_id, created_at DESC);

-- RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Recriar policies (idempotente)
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages"
  ON public.messages
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = messages.contact_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create own messages" ON public.messages;
CREATE POLICY "Users can create own messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = messages.contact_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Users can update own messages"
  ON public.messages
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages"
  ON public.messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
