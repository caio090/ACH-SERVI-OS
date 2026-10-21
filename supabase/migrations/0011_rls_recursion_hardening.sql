-- ACHÔ SERVIÇO — remove recursão entre policies de service_requests/request_matches
-- e centraliza checagens cruzadas em helpers security-definer fora do schema exposto.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_request_owner(target_request_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, private
as $$
  select exists (
    select 1
    from public.service_requests sr
    where sr.id = target_request_id
      and sr.client_id = auth.uid()
  );
$$;

create or replace function private.is_request_professional(target_request_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, private
as $$
  select exists (
    select 1
    from public.request_matches rm
    where rm.request_id = target_request_id
      and rm.professional_id = auth.uid()
  );
$$;

create or replace function private.can_access_request_text(target_request_id text)
returns boolean
language sql
security definer
stable
set search_path = public, private
as $$
  select exists (
    select 1
    from public.service_requests sr
    where sr.id::text = target_request_id
      and (
        sr.client_id = auth.uid()
        or public.is_admin()
        or exists (
          select 1
          from public.request_matches rm
          where rm.request_id = sr.id
            and rm.professional_id = auth.uid()
        )
      )
  );
$$;

create or replace function private.is_request_owner_text(target_request_id text)
returns boolean
language sql
security definer
stable
set search_path = public, private
as $$
  select exists (
    select 1
    from public.service_requests sr
    where sr.id::text = target_request_id
      and sr.client_id = auth.uid()
  );
$$;

revoke execute on function private.is_request_owner(uuid) from public, anon, authenticated;
grant execute on function private.is_request_owner(uuid) to authenticated;
revoke execute on function private.is_request_professional(uuid) from public, anon, authenticated;
grant execute on function private.is_request_professional(uuid) to authenticated;
revoke execute on function private.can_access_request_text(text) from public, anon, authenticated;
grant execute on function private.can_access_request_text(text) to authenticated;
revoke execute on function private.is_request_owner_text(text) from public, anon, authenticated;
grant execute on function private.is_request_owner_text(text) to authenticated;

drop policy if exists service_requests_select_involved on public.service_requests;
create policy service_requests_select_involved on public.service_requests
  for select to authenticated
  using (
    client_id = auth.uid()
    or public.is_admin()
    or private.is_request_professional(id)
  );

drop policy if exists request_matches_select_involved on public.request_matches;
create policy request_matches_select_involved on public.request_matches
  for select to authenticated
  using (
    professional_id = auth.uid()
    or public.is_admin()
    or private.is_request_owner(request_id)
  );

drop policy if exists request_matches_insert_by_request_owner on public.request_matches;
create policy request_matches_insert_by_request_owner on public.request_matches
  for insert to authenticated
  with check (
    public.is_admin()
    or private.is_request_owner(request_id)
  );

drop policy if exists conversations_insert_involved on public.conversations;
create policy conversations_insert_involved on public.conversations
  for insert to authenticated
  with check (
    public.is_admin()
    or (client_id = auth.uid() and private.is_request_owner(request_id))
    or (professional_id = auth.uid() and private.is_request_professional(request_id))
  );

drop policy if exists request_photos_select_involved on storage.objects;
create policy request_photos_select_involved on storage.objects
  for select to authenticated
  using (
    bucket_id = 'request-photos'
    and private.can_access_request_text((storage.foldername(name))[1])
  );

drop policy if exists request_photos_write_owner on storage.objects;
create policy request_photos_write_owner on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'request-photos'
    and private.is_request_owner_text((storage.foldername(name))[1])
  );
