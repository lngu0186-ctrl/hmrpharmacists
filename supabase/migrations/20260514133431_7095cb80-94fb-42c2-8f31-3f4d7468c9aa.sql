
REVOKE EXECUTE ON FUNCTION public.is_verified_pharmacist(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_invitation_event() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_verified_pharmacist(uuid) TO authenticated, service_role;
