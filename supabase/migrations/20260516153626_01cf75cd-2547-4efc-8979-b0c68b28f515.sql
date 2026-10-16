
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite_id uuid;
  v_email text := lower(coalesce(new.email, ''));
BEGIN
  -- Bootstrap: if there is NO existing user yet, allow this signup as owner.
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id <> new.id) THEN
    INSERT INTO public.profiles (id, full_name)
    VALUES (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'owner')
      ON CONFLICT DO NOTHING;
    RETURN new;
  END IF;

  SELECT id INTO v_invite_id FROM public.invites
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

  INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'member')
    ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$;
