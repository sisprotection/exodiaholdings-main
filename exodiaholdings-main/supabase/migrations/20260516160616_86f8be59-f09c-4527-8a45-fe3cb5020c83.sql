
-- Beneficiary gender
DO $$ BEGIN
  CREATE TYPE public.beneficiary_gender AS ENUM ('female','male','other','unspecified');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.beneficiaries
  ADD COLUMN IF NOT EXISTS gender public.beneficiary_gender NOT NULL DEFAULT 'unspecified';

-- Vault items (private)
CREATE TABLE IF NOT EXISTS public.vault_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cabinet text NOT NULL DEFAULT 'General',
  category text NOT NULL DEFAULT 'login',
  label text NOT NULL,
  username text,
  password_ciphertext text,
  url text,
  serial_number text,
  location text,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users fully own their vault" ON public.vault_items;
CREATE POLICY "Users fully own their vault"
  ON public.vault_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_vault_items_touch ON public.vault_items;
CREATE TRIGGER trg_vault_items_touch
  BEFORE UPDATE ON public.vault_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_vault_user_cabinet ON public.vault_items(user_id, cabinet);

-- Invite role pre-assignment
ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS invited_role public.app_role NOT NULL DEFAULT 'member';

CREATE OR REPLACE FUNCTION public.can_grant_role(_inviter uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _role
    WHEN 'member'         THEN true
    WHEN 'admin'          THEN public.has_role(_inviter, 'owner') OR public.has_role(_inviter, 'vice_president')
    WHEN 'vice_president' THEN public.has_role(_inviter, 'owner')
    WHEN 'owner'          THEN false
    WHEN 'trustee'        THEN public.has_role(_inviter, 'owner') OR public.has_role(_inviter, 'vice_president')
    ELSE false
  END
$$;

REVOKE EXECUTE ON FUNCTION public.can_grant_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Inviter can create invites" ON public.invites;
CREATE POLICY "Inviter can create invites"
  ON public.invites
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = invited_by
    AND public.can_grant_role(auth.uid(), invited_role)
  );

-- Update new-user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite_id uuid;
  v_invite_role public.app_role;
  v_email text := lower(coalesce(new.email, ''));
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id <> new.id) THEN
    INSERT INTO public.profiles (id, full_name)
    VALUES (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'owner')
      ON CONFLICT DO NOTHING;
    RETURN new;
  END IF;

  SELECT id, invited_role INTO v_invite_id, v_invite_role
  FROM public.invites
  WHERE lower(email) = v_email
    AND used_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_invite_id IS NULL THEN
    RAISE EXCEPTION 'Access by invitation only. No valid invite found for %', new.email
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.invites SET used_at = now(), used_by = new.id WHERE id = v_invite_id;

  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, COALESCE(v_invite_role, 'member'))
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$;
