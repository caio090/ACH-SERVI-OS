-- ACHÔ SERVIÇO — permite que triggers internos atualizem métricas calculadas,
-- mantendo bloqueada a alteração direta pelo próprio profissional.

create or replace function public.prevent_professional_managed_field_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.is_verified := old.is_verified;

    if pg_trigger_depth() <= 1 then
      new.average_rating := old.average_rating;
      new.review_count := old.review_count;
      new.response_rate := old.response_rate;
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.prevent_professional_managed_field_escalation()
from public, anon, authenticated;
