
-- 1. Add heir role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'heir';

-- 2. Heir relationships table
CREATE TABLE public.heir_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL,
  heir_id uuid NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guardian_id, heir_id)
);

ALTER TABLE public.heir_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guardian manages own heir links"
  ON public.heir_relationships FOR ALL
  TO authenticated
  USING (auth.uid() = guardian_id)
  WITH CHECK (auth.uid() = guardian_id);

CREATE POLICY "Heir can view own link"
  ON public.heir_relationships FOR SELECT
  TO authenticated
  USING (auth.uid() = heir_id);

-- 3. Helper
CREATE OR REPLACE FUNCTION public.is_heir_of(_guardian uuid, _heir uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.heir_relationships
    WHERE guardian_id = _guardian AND heir_id = _heir
  )
$$;

-- 4. Visibility toggles
ALTER TABLE public.properties      ADD COLUMN IF NOT EXISTS visible_to_heir boolean NOT NULL DEFAULT false;
ALTER TABLE public.beneficiaries   ADD COLUMN IF NOT EXISTS visible_to_heir boolean NOT NULL DEFAULT true;

-- 5. Heir SELECT policies on visible content
CREATE POLICY "Heir can view visible properties"
  ON public.properties FOR SELECT
  TO authenticated
  USING (visible_to_heir = true AND public.is_heir_of(owner_id, auth.uid()));

CREATE POLICY "Heir can view photos of visible properties"
  ON public.property_photos FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_photos.property_id
      AND p.visible_to_heir = true
      AND public.is_heir_of(p.owner_id, auth.uid())
  ));

CREATE POLICY "Heir can view visible beneficiaries"
  ON public.beneficiaries FOR SELECT
  TO authenticated
  USING (visible_to_heir = true AND public.is_heir_of(user_id, auth.uid()));

-- 6. Storage: heir can read property-photos for visible properties
CREATE POLICY "Heir can read photos for visible properties"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'property-photos'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.owner_id::text = (storage.foldername(name))[1]
        AND p.visible_to_heir = true
        AND public.is_heir_of(p.owner_id, auth.uid())
    )
  );

-- 7. Love notes
CREATE TABLE public.heir_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL,
  heir_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX heir_messages_heir_idx ON public.heir_messages(heir_id, created_at DESC);

ALTER TABLE public.heir_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guardian writes notes to their heir"
  ON public.heir_messages FOR ALL
  TO authenticated
  USING (auth.uid() = guardian_id AND public.is_heir_of(guardian_id, heir_id))
  WITH CHECK (auth.uid() = guardian_id AND public.is_heir_of(guardian_id, heir_id));

CREATE POLICY "Heir reads notes addressed to them"
  ON public.heir_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = heir_id);

-- 8. can_grant_role: only owner may grant 'heir'
CREATE OR REPLACE FUNCTION public.can_grant_role(_inviter uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _role::text = 'member'         THEN true
    WHEN _role::text = 'admin'          THEN public.has_role(_inviter, 'owner') OR public.has_role(_inviter, 'vice_president')
    WHEN _role::text = 'vice_president' THEN public.has_role(_inviter, 'owner')
    WHEN _role::text = 'owner'          THEN false
    WHEN _role::text = 'trustee'        THEN public.has_role(_inviter, 'owner') OR public.has_role(_inviter, 'vice_president')
    WHEN _role::text = 'heir'           THEN public.has_role(_inviter, 'owner')
    ELSE false
  END
$$;
