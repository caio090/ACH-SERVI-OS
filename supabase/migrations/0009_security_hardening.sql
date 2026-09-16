-- ACHÔ SERVIÇO — hardening de funções expostas pela API

alter function public.set_updated_at() set search_path = public;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.refresh_professional_rating() from public, anon, authenticated;
revoke execute on function public.validate_review_eligibility() from public, anon, authenticated;
revoke execute on function public.enforce_request_cooldown() from public, anon, authenticated;
revoke execute on function public.sync_request_status_on_match_response() from public, anon, authenticated;
revoke execute on function public.sync_request_status_on_appointment_insert() from public, anon, authenticated;
revoke execute on function public.sync_request_status_on_appointment_update() from public, anon, authenticated;
revoke execute on function public.prevent_profile_privilege_escalation() from public, anon, authenticated;

revoke execute on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

revoke execute on function public.is_own_professional_profile(uuid) from public, anon, authenticated;
grant execute on function public.is_own_professional_profile(uuid) to authenticated;

revoke execute on function public.get_request_client_name(uuid) from public, anon, authenticated;
grant execute on function public.get_request_client_name(uuid) to authenticated;

revoke execute on function public.get_appointment_contact(uuid) from public, anon, authenticated;
grant execute on function public.get_appointment_contact(uuid) to authenticated;
