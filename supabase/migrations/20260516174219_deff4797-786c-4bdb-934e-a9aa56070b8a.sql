
DROP POLICY IF EXISTS "Owner read own documents" ON storage.objects;
DROP POLICY IF EXISTS "Owner trustee read property photos" ON storage.objects;

CREATE POLICY "Owner or scoped trustee read documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'property-documents'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.is_trustee_of(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);

CREATE POLICY "Owner or scoped trustee read property photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'property-photos'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.is_trustee_of(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);

DROP POLICY IF EXISTS "Inviter can create invites" ON public.invites;

CREATE POLICY "Board can create invites"
ON public.invites FOR INSERT
TO authenticated
WITH CHECK (
  invited_by = auth.uid()
  AND (
    public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'vice_president')
    OR public.has_role(auth.uid(), 'admin')
  )
  AND public.can_grant_role(auth.uid(), invited_role)
);

REVOKE EXECUTE ON FUNCTION public.can_grant_role(uuid, public.app_role) FROM authenticated, anon, public;

INSERT INTO storage.buckets (id, name, public)
VALUES ('legacy-docs', 'legacy-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Owner read own legacy docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'legacy-docs' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Owner upload own legacy docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'legacy-docs' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Owner update own legacy docs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'legacy-docs' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Owner delete own legacy docs"
ON storage.objects FOR DELETE
USING (bucket_id = 'legacy-docs' AND (storage.foldername(name))[1] = (auth.uid())::text);
