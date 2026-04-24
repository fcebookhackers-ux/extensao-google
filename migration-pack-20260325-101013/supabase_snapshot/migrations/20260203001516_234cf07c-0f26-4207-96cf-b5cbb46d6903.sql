-- Add Yjs CRDT state columns (BYTEA) to existing tables
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS yjs_state bytea;

ALTER TABLE public.automations
ADD COLUMN IF NOT EXISTS yjs_state bytea;