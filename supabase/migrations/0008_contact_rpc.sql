-- ACHÔ SERVIÇO — funções RPC para liberar dados pontuais entre as partes
-- envolvidas, sem afrouxar a policy geral de profiles (select restrito ao
-- próprio dono). Cada função valida explicitamente o envolvimento do
-- chamador antes de retornar qualquer dado.

-- Nome/avatar do cliente, visível para o próprio cliente e para
-- profissionais notificados sobre o pedido (não inclui telefone/e-mail —
-- contato pessoal só é liberado após agendamento confirmado, ver abaixo).
create or replace function public.get_request_client_name(p_request_id uuid)
returns table (full_name text, avatar_path text)
language plpgsql
security definer
set search_path = public
as $$
declare
  sr public.service_requests%rowtype;
begin
  select * into sr from public.service_requests where id = p_request_id;
  if sr is null then
    raise exception 'pedido não encontrado';
  end if;

  if not (
    auth.uid() = sr.client_id
    or public.is_admin()
    or exists (
      select 1 from public.request_matches rm
      where rm.request_id = sr.id and rm.professional_id = auth.uid()
    )
  ) then
    raise exception 'acesso negado';
  end if;

  return query select p.full_name, p.avatar_path from public.profiles p where p.id = sr.client_id;
end;
$$;

grant execute on function public.get_request_client_name(uuid) to authenticated;

-- Contato pessoal (telefone/e-mail) da contraparte de um agendamento —
-- só existe linha de appointment após confirmação, então a própria
-- existência do agendamento já é o gatilho de liberação exigido pelo plano.
create or replace function public.get_appointment_contact(p_appointment_id uuid)
returns table (full_name text, phone text, email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  appt public.appointments%rowtype;
  counterparty_id uuid;
begin
  select * into appt from public.appointments where id = p_appointment_id;

  if appt is null then
    raise exception 'agendamento não encontrado';
  end if;

  if not (auth.uid() = appt.client_id or auth.uid() = appt.professional_id or public.is_admin()) then
    raise exception 'acesso negado';
  end if;

  counterparty_id := case when auth.uid() = appt.client_id then appt.professional_id else appt.client_id end;

  return query select p.full_name, p.phone, p.email from public.profiles p where p.id = counterparty_id;
end;
$$;

grant execute on function public.get_appointment_contact(uuid) to authenticated;
