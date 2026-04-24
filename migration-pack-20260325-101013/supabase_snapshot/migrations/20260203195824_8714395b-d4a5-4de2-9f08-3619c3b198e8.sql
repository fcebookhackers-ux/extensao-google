-- AI-powered contact enrichment (suggestions + review)

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS ai_name_suggestion text,
  ADD COLUMN IF NOT EXISTS ai_category_suggestion text,
  ADD COLUMN IF NOT EXISTS ai_tags_suggestion text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS ai_sentiment_suggestion text,
  ADD COLUMN IF NOT EXISTS ai_summary_suggestion text,
  ADD COLUMN IF NOT EXISTS ai_review_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ai_enriched_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_reviewed_at timestamptz;

-- Helpful index for dashboards/metrics
CREATE INDEX IF NOT EXISTS idx_contacts_ai_review_status ON public.contacts (ai_review_status);
CREATE INDEX IF NOT EXISTS idx_contacts_ai_enriched_at ON public.contacts (ai_enriched_at);

-- Normalize allowed statuses via trigger (avoid CHECK constraint immutability pitfalls)
CREATE OR REPLACE FUNCTION public.validate_contacts_ai_review_status()
RETURNS trigger AS $$
BEGIN
  IF NEW.ai_review_status IS NULL OR NEW.ai_review_status = '' THEN
    NEW.ai_review_status := 'pending';
  END IF;

  IF NEW.ai_review_status NOT IN ('pending', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid ai_review_status: %', NEW.ai_review_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_contacts_ai_review_status ON public.contacts;
CREATE TRIGGER trg_validate_contacts_ai_review_status
BEFORE INSERT OR UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.validate_contacts_ai_review_status();
