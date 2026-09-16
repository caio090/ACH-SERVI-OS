-- ACHÔ SERVIÇO — protege campos gerenciados do perfil profissional.
-- Profissionais podem editar bio/áreas/raio/estado ativo, mas não podem
-- auto-verificar nem forjar métricas de reputação.

create or replace function public.prevent_professional_managed_field_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.is_verified := old.is_verified;
    new.average_rating := old.average_rating;
    new.review_count := old.review_count;
    new.response_rate := old.response_rate;
  end if;
  return new;
end;
$$;

create trigger prevent_professional_managed_field_escalation_before_update
  before update on public.professional_profiles
  for each row execute function public.prevent_professional_managed_field_escalation();

revoke execute on function public.prevent_professional_managed_field_escalation()
from public, anon, authenticated;
