-- ACHÔ SERVIÇO — valida a criação de agendamento pelo cliente.
--
-- Problema encontrado na auditoria do sprint de hardening: a policy
-- appointments_insert_by_client só checava client_id = auth.uid(). Um cliente
-- podia inserir um appointment direto pela API apontando para um match ainda
-- pendente (ou recusado) e o trigger sync_request_status_on_appointment_insert
-- forçava esse match para 'accepted' — liberando telefone/e-mail do
-- profissional via get_appointment_contact sem que ele tivesse aceitado.
-- Isso violava a regra de contato oculto pré-confirmação do plano mestre.
--
-- Correção: trigger before insert que, para não-admin, exige que o pedido seja
-- do cliente e esteja em aberto, e que o match pertença ao mesmo pedido e
-- profissional e já tenha sido aceito ou respondido com proposta de horário.

create or replace function public.validate_appointment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sr public.service_requests%rowtype;
  rm public.request_matches%rowtype;
begin
  if public.is_admin() then
    return new;
  end if;

  select * into sr from public.service_requests where id = new.request_id;
  if sr.id is null or sr.client_id <> auth.uid() or new.client_id <> auth.uid() then
    raise exception 'agendamento só pode ser criado pelo cliente dono do pedido';
  end if;

  if sr.status not in ('open', 'reviewing', 'accepted') then
    raise exception 'este pedido não está mais aberto para agendamento';
  end if;

  select * into rm from public.request_matches where id = new.request_match_id;
  if rm.id is null or rm.request_id <> new.request_id or rm.professional_id <> new.professional_id then
    raise exception 'o profissional informado não corresponde a este pedido';
  end if;

  if rm.status not in ('accepted', 'proposed_new_time') then
    raise exception 'o profissional ainda não aceitou este pedido';
  end if;

  new.status := 'scheduled';
  new.contact_released_at := now();
  new.completed_at := null;
  return new;
end;
$$;

create trigger validate_appointment_insert_before_insert
  before insert on public.appointments
  for each row execute function public.validate_appointment_insert();

revoke execute on function public.validate_appointment_insert() from public, anon, authenticated;
