
REVOKE EXECUTE ON FUNCTION public.is_trustee_of(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_trustee_of(uuid, uuid) TO authenticated;
