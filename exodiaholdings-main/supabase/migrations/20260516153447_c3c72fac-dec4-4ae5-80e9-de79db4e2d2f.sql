
-- 1. Add 'member' role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'member';

-- 2. Payment frequency enum + columns
DO $$ BEGIN
  CREATE TYPE public.payment_frequency AS ENUM (
    'one_time','monthly','quarterly','semi_annual','annual','biennial','triennial','every_5_years','custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS payment_frequency public.payment_frequency NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS payment_interval_months integer;

-- 3. letter_of_intent on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS letter_of_intent text;

-- 4. Trust relationships (scope trustee access)
CREATE TABLE IF NOT EXISTS public.trust_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grantor_id uuid NOT NULL,
  trustee_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grantor_id, trustee_id)
);
ALTER TABLE public.trust_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Grantor or trustee can view their relationship"
  ON public.trust_relationships FOR SELECT TO authenticated
  USING (auth.uid() = grantor_id OR auth.uid() = trustee_id);

CREATE POLICY "Grantor manages their trust relationships"
  ON public.trust_relationships FOR ALL TO authenticated
  USING (auth.uid() = grantor_id) WITH CHECK (auth.uid() = grantor_id);

-- 5. Security definer: is the trustee scoped to this grantor?
CREATE OR REPLACE FUNCTION public.is_trustee_of(_grantor_id uuid, _trustee_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trust_relationships
    WHERE grantor_id = _grantor_id AND trustee_id = _trustee_id
  )
$$;

-- 6. Replace global trustee policies with scoped ones
DROP POLICY IF EXISTS "Owners and trustees can view properties" ON public.properties;
CREATE POLICY "Owners and scoped trustees can view properties"
  ON public.properties FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.is_trustee_of(owner_id, auth.uid()));

DROP POLICY IF EXISTS "View co-owners for accessible properties" ON public.co_owners;
CREATE POLICY "View co-owners for accessible properties"
  ON public.co_owners FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.properties p
    WHERE p.id = co_owners.property_id
      AND (p.owner_id = auth.uid() OR public.is_trustee_of(p.owner_id, auth.uid()))));

DROP POLICY IF EXISTS "View payments for accessible properties" ON public.payments;
CREATE POLICY "View payments for accessible properties"
  ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.properties p
    WHERE p.id = payments.property_id
      AND (p.owner_id = auth.uid() OR public.is_trustee_of(p.owner_id, auth.uid()))));

DROP POLICY IF EXISTS "View docs for accessible properties" ON public.property_documents;
CREATE POLICY "View docs for accessible properties"
  ON public.property_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.properties p
    WHERE p.id = property_documents.property_id
      AND (p.owner_id = auth.uid() OR public.is_trustee_of(p.owner_id, auth.uid()))));

DROP POLICY IF EXISTS "View photos for accessible properties" ON public.property_photos;
CREATE POLICY "View photos for accessible properties"
  ON public.property_photos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.properties p
    WHERE p.id = property_photos.property_id
      AND (p.owner_id = auth.uid() OR public.is_trustee_of(p.owner_id, auth.uid()))));

DROP POLICY IF EXISTS "View sale records for accessible properties" ON public.sale_records;
CREATE POLICY "View sale records for accessible properties"
  ON public.sale_records FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.properties p
    WHERE p.id = sale_records.property_id
      AND (p.owner_id = auth.uid() OR public.is_trustee_of(p.owner_id, auth.uid()))));

DROP POLICY IF EXISTS "Profiles viewable by owner or trustee" ON public.profiles;
CREATE POLICY "Profiles viewable by self or scoped trustee"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_trustee_of(id, auth.uid()));

-- 7. Invites table
CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  email text NOT NULL,
  display_name text,
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamptz,
  used_by uuid
);
CREATE INDEX IF NOT EXISTS invites_email_idx ON public.invites (lower(email));
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inviter can view their invites"
  ON public.invites FOR SELECT TO authenticated
  USING (auth.uid() = invited_by);

CREATE POLICY "Inviter can create invites"
  ON public.invites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Inviter can delete unused invites"
  ON public.invites FOR DELETE TO authenticated
  USING (auth.uid() = invited_by AND used_at IS NULL);

-- 8. Beneficiaries table (per-user)
CREATE TABLE IF NOT EXISTS public.beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  dob date,
  relationship text,
  share_percent numeric(5,2) NOT NULL DEFAULT 0,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own beneficiaries"
  ON public.beneficiaries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER beneficiaries_touch
  BEFORE UPDATE ON public.beneficiaries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 9. Update new-user trigger: invited users -> 'member', others -> 'owner' (bootstrap)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite_id uuid;
  v_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));

  SELECT id INTO v_invite_id FROM public.invites
   WHERE lower(email) = lower(new.email)
     AND used_at IS NULL
     AND expires_at > now()
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_invite_id IS NOT NULL THEN
    UPDATE public.invites SET used_at = now(), used_by = new.id WHERE id = v_invite_id;
    v_role := 'member';
  ELSE
    v_role := 'owner';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (new.id, v_role)
    ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$;
