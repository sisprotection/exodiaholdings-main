GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_grant_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_trustee_of(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_heir_of(uuid, uuid) TO authenticated, anon;