-- ACHÔ SERVIÇO — funções e triggers de suporte

-- =========================================================================
-- updated_at automático
-- =========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.professional_profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.service_requests
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

-- =========================================================================
-- cria profile automaticamente ao criar um usuário no Supabase Auth
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- helper: usuário autenticado é admin? (security definer evita recursão de RLS)
-- =========================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- =========================================================================
-- helper: usuário autenticado é o profissional dono de um professional_profile?
-- (usado em policies para evitar subqueries repetidas)
-- =========================================================================
create or replace function public.is_own_professional_profile(target_professional_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select target_professional_id = auth.uid();
$$;

-- =========================================================================
-- recalcula nota média e contagem de avaliações do profissional
-- =========================================================================
create or replace function public.refresh_professional_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.professional_profiles
  set
    average_rating = coalesce((
      select round(avg(rating)::numeric, 2) from public.reviews
      where professional_id = coalesce(new.professional_id, old.professional_id)
    ), 0),
    review_count = (
      select count(*) from public.reviews
      where professional_id = coalesce(new.professional_id, old.professional_id)
    )
  where id = coalesce(new.professional_id, old.professional_id);
  return coalesce(new, old);
end;
$$;

create trigger refresh_professional_rating_on_review
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_professional_rating();

-- =========================================================================
-- só permite criar review se o appointment estiver completed e pertencer ao cliente
-- =========================================================================
create or replace function public.validate_review_eligibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  appt public.appointments%rowtype;
begin
  select * into appt from public.appointments where id = new.appointment_id;

  if appt is null then
    raise exception 'appointment não encontrado';
  end if;

  if appt.status <> 'completed' then
    raise exception 'avaliação só pode ser criada após o atendimento ser concluído';
  end if;

  if appt.client_id <> new.client_id then
    raise exception 'apenas o cliente do atendimento pode avaliar';
  end if;

  if appt.professional_id <> new.professional_id then
    raise exception 'professional_id não corresponde ao atendimento';
  end if;

  return new;
end;
$$;

create trigger validate_review_eligibility_before_insert
  before insert on public.reviews
  for each row execute function public.validate_review_eligibility();

-- =========================================================================
-- cooldown simples entre pedidos consecutivos do mesmo cliente
-- (rate limiting de aplicação — ver decisão registrada no plano mestre)
-- =========================================================================
create or replace function public.enforce_request_cooldown()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  last_request_at timestamptz;
  cooldown interval := interval '60 seconds';
begin
  if new.status = 'draft' then
    return new;
  end if;

  select max(created_at) into last_request_at
  from public.service_requests
  where client_id = new.client_id and id <> new.id;

  if last_request_at is not null and now() - last_request_at < cooldown then
    raise exception 'aguarde um instante antes de enviar outro pedido';
  end if;

  return new;
end;
$$;

create trigger enforce_request_cooldown_before_insert
  before insert on public.service_requests
  for each row execute function public.enforce_request_cooldown();

-- =========================================================================
-- transições de status do pedido, refletindo o ciclo do plano mestre:
-- draft -> open -> reviewing -> accepted -> scheduled -> in_service -> completed
-- =========================================================================

-- profissional responde (aceita ou propõe novo horário) => pedido vira "reviewing"
create or replace function public.sync_request_status_on_match_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('accepted', 'proposed_new_time') and old.status = 'pending' then
    update public.service_requests
    set status = 'reviewing'
    where id = new.request_id and status = 'open';
  end if;
  return new;
end;
$$;

create trigger sync_request_status_on_match_response
  after update on public.request_matches
  for each row execute function public.sync_request_status_on_match_response();

-- appointment criado (cliente confirmou) => pedido vira "scheduled" e contato libera
create or replace function public.sync_request_status_on_appointment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.service_requests
  set status = 'scheduled', accepted_match_id = new.request_match_id
  where id = new.request_id;

  update public.request_matches
  set status = 'accepted', responded_at = coalesce(responded_at, now())
  where id = new.request_match_id;

  return new;
end;
$$;

create trigger sync_request_status_on_appointment_insert
  after insert on public.appointments
  for each row execute function public.sync_request_status_on_appointment_insert();

-- mudança de status do appointment propaga para o pedido
create or replace function public.sync_request_status_on_appointment_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status <> 'completed' then
    new.completed_at = now();
    update public.service_requests set status = 'completed' where id = new.request_id;
  elsif new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.service_requests set status = 'cancelled' where id = new.request_id;
  elsif new.status = 'in_service' and old.status <> 'in_service' then
    update public.service_requests set status = 'in_service' where id = new.request_id;
  end if;
  return new;
end;
$$;

create trigger sync_request_status_on_appointment_update
  before update on public.appointments
  for each row execute function public.sync_request_status_on_appointment_update();

-- =========================================================================
-- impede que um usuário comum promova a si mesmo a admin ou remova sua
-- própria suspensão — apenas admins podem alterar role/is_suspended.
-- =========================================================================
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.is_suspended is distinct from old.is_suspended)
     and not public.is_admin() then
    new.role = old.role;
    new.is_suspended = old.is_suspended;
  end if;
  return new;
end;
$$;

create trigger prevent_profile_privilege_escalation_before_update
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_escalation();
