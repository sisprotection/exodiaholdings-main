
DO $$ BEGIN
  CREATE TYPE public.payment_source_kind AS ENUM ('card','bank','gig','employer','company','cash','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.payment_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind public.payment_source_kind NOT NULL DEFAULT 'other',
  label text NOT NULL,
  brand text,
  last4 text,
  encrypted_details text,
  color text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users fully own their payment sources" ON public.payment_sources;
CREATE POLICY "Users fully own their payment sources"
  ON public.payment_sources FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER payment_sources_touch BEFORE UPDATE ON public.payment_sources
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS payment_source_id uuid REFERENCES public.payment_sources(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_source_id uuid REFERENCES public.payment_sources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payment_sources_user ON public.payment_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_payment_source ON public.properties(payment_source_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_source ON public.payments(payment_source_id);
