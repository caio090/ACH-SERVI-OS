-- ACHÔ SERVIÇO — audit log administrativo append-only, gravado pelo banco.
--
-- Antes: admin_action_logs (0002) tinha policy "for all" para admins — um
-- admin podia editar/apagar registros — e o app gravava o log depois da ação,
-- sem checar erro. Ações feitas por admin direto pela API não eram logadas.
--
-- Agora:
-- 1) Admins só leem. Ninguém insere pela API: os registros são gravados por
--    triggers security definer nas tabelas administradas (não dá para pular).
-- 2) Update/delete bloqueados por trigger para todos os papéis da API.
-- 3) Campos: admin_id (quem), action (o quê), target_type/target_id (qual
--    registro), metadata (antes/depois, sem dado sensível) e created_at.

drop policy if exists admin_action_logs_admin_only on public.admin_action_logs;

create policy admin_action_logs_select_admin on public.admin_action_logs
  for select to authenticated
  using (public.is_admin());

revoke insert, update, delete, truncate on public.admin_action_logs from anon, authenticated;

create index if not exists admin_action_logs_created_at_idx on public.admin_action_logs (created_at desc);
create index if not exists admin_action_logs_target_idx on public.admin_action_logs (target_type, target_id);

create or replace function public.prevent_admin_action_log_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'audit log é append-only: registros não podem ser alterados ou removidos';
end;
$$;

create trigger prevent_admin_action_log_mutation
  before update or delete on public.admin_action_logs
  for each row execute function public.prevent_admin_action_log_mutation();

-- -------------------------------------------------------------------------
-- Gravação do log
-- -------------------------------------------------------------------------
create or replace function private.write_admin_log(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_metadata jsonb
)
returns void
language sql
security definer
set search_path = public, private
as $$
  insert into public.admin_action_logs (admin_id, action, target_type, target_id, metadata)
  values (auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_metadata, '{}'::jsonb));
$$;

revoke execute on function private.write_admin_log(text, text, uuid, jsonb) from public, anon, authenticated;

/**
 * Trigger after insert/update/delete nas tabelas administradas. Só registra
 * quando quem executa é admin e a mudança vem direto do comando (depth 1),
 * para não duplicar efeitos colaterais de outros triggers.
 */
create or replace function public.audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or pg_trigger_depth() > 1 or not public.is_admin() then
    return coalesce(new, old);
  end if;

  if tg_table_name = 'profiles' and tg_op = 'UPDATE' then
    if new.is_suspended is distinct from old.is_suspended then
      perform private.write_admin_log(
        case when new.is_suspended then 'user.suspended' else 'user.reactivated' end,
        'user', new.id, '{}'::jsonb);
    end if;
    if new.role is distinct from old.role then
      perform private.write_admin_log('user.role_changed', 'user', new.id,
        jsonb_build_object('from', old.role, 'to', new.role));
    end if;

  elsif tg_table_name = 'professional_profiles' and tg_op = 'UPDATE' then
    if new.is_verified is distinct from old.is_verified then
      perform private.write_admin_log(
        case when new.is_verified then 'professional.verified' else 'professional.unverified' end,
        'professional', new.id, '{}'::jsonb);
    end if;
    if new.is_active is distinct from old.is_active and new.id <> actor then
      perform private.write_admin_log(
        case when new.is_active then 'professional.reactivated' else 'professional.paused' end,
        'professional', new.id, '{}'::jsonb);
    end if;

  elsif tg_table_name = 'categories' then
    if tg_op = 'INSERT' then
      perform private.write_admin_log('category.created', 'category', new.id,
        jsonb_build_object('slug', new.slug, 'name', new.name, 'is_active', new.is_active));
    elsif tg_op = 'UPDATE' then
      perform private.write_admin_log('category.updated', 'category', new.id,
        jsonb_build_object(
          'slug', new.slug,
          'changes', jsonb_strip_nulls(jsonb_build_object(
            'name', case when new.name is distinct from old.name then jsonb_build_object('from', old.name, 'to', new.name) end,
            'slug', case when new.slug is distinct from old.slug then jsonb_build_object('from', old.slug, 'to', new.slug) end,
            'is_active', case when new.is_active is distinct from old.is_active then jsonb_build_object('from', old.is_active, 'to', new.is_active) end,
            'sort_order', case when new.sort_order is distinct from old.sort_order then jsonb_build_object('from', old.sort_order, 'to', new.sort_order) end
          ))));
    else
      perform private.write_admin_log('category.deleted', 'category', old.id,
        jsonb_build_object('slug', old.slug, 'name', old.name));
    end if;

  elsif tg_table_name = 'reports' and tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      perform private.write_admin_log('report.resolved', 'report', new.id,
        jsonb_build_object('from', old.status, 'to', new.status, 'target_type', new.target_type));
    end if;

  elsif tg_table_name = 'reviews' and tg_op = 'DELETE' then
    -- O comentário não é copiado para o log (pode conter dado pessoal/ofensa).
    perform private.write_admin_log('review.deleted', 'review', old.id,
      jsonb_build_object('professional_id', old.professional_id, 'rating', old.rating));

  elsif tg_table_name = 'service_requests' and tg_op = 'UPDATE' then
    if new.status is distinct from old.status and new.client_id <> actor then
      perform private.write_admin_log('service_request.status_changed', 'service_request', new.id,
        jsonb_build_object('from', old.status, 'to', new.status));
    end if;

  elsif tg_table_name = 'appointments' and tg_op = 'UPDATE' then
    if new.status is distinct from old.status and actor not in (new.client_id, new.professional_id) then
      perform private.write_admin_log('appointment.status_changed', 'appointment', new.id,
        jsonb_build_object('from', old.status, 'to', new.status));
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

revoke execute on function public.audit_admin_change() from public, anon, authenticated;
revoke execute on function public.prevent_admin_action_log_mutation() from public, anon, authenticated;

create trigger audit_admin_change after update on public.profiles
  for each row execute function public.audit_admin_change();
create trigger audit_admin_change after update on public.professional_profiles
  for each row execute function public.audit_admin_change();
create trigger audit_admin_change after insert or update or delete on public.categories
  for each row execute function public.audit_admin_change();
create trigger audit_admin_change after update on public.reports
  for each row execute function public.audit_admin_change();
create trigger audit_admin_change after delete on public.reviews
  for each row execute function public.audit_admin_change();
create trigger audit_admin_change after update on public.service_requests
  for each row execute function public.audit_admin_change();
create trigger audit_admin_change after update on public.appointments
  for each row execute function public.audit_admin_change();
