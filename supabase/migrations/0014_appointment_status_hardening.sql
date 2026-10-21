-- ACHÔ SERVIÇO — restringe alterações de status do appointment por papel.
-- Cliente pode cancelar o próprio atendimento, profissional pode iniciar/concluir/no-show/cancelar,
-- e admin pode administrar.

create or replace function public.validate_appointment_status_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.request_id is distinct from old.request_id
     or new.request_match_id is distinct from old.request_match_id
     or new.client_id is distinct from old.client_id
     or new.professional_id is distinct from old.professional_id
     or new.scheduled_date is distinct from old.scheduled_date
     or new.time_window_start is distinct from old.time_window_start
     or new.time_window_end is distinct from old.time_window_end
     or new.contact_released_at is distinct from old.contact_released_at then
    raise exception 'campos estruturais do agendamento não podem ser alterados';
  end if;

  if new.status is distinct from old.status then
    if auth.uid() = old.client_id then
      if new.status <> 'cancelled' then
        raise exception 'cliente só pode cancelar o atendimento';
      end if;
    elsif auth.uid() = old.professional_id then
      if not (
        (old.status = 'scheduled' and new.status in ('in_service','cancelled','no_show'))
        or (old.status = 'in_service' and new.status in ('completed','cancelled'))
      ) then
        raise exception 'transição de status inválida para o profissional';
      end if;
    else
      raise exception 'acesso negado';
    end if;
  end if;

  return new;
end;
$$;

create trigger validate_appointment_status_actor_before_update
  before update on public.appointments
  for each row execute function public.validate_appointment_status_actor();

revoke execute on function public.validate_appointment_status_actor()
from public, anon, authenticated;
