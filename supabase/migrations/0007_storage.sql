-- ACHÔ SERVIÇO — buckets de Storage e políticas de upload validado
-- Convenção de path: {user_id}/... para avatars/portfolio, {request_id}/... para
-- fotos de pedido (para permitir leitura pelo profissional notificado).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('portfolio', 'portfolio', true, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('request-photos', 'request-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- avatars — leitura pública, escrita só no próprio path {auth.uid()}/...
create policy avatars_select_public on storage.objects
  for select using (bucket_id = 'avatars');

create policy avatars_write_own on storage.objects
  for all
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- portfolio — leitura pública, escrita só no próprio path {auth.uid()}/...
create policy portfolio_select_public on storage.objects
  for select using (bucket_id = 'portfolio');

create policy portfolio_write_own on storage.objects
  for all
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);

-- request-photos — privado: cliente dono do pedido e profissionais notificados
-- podem ler; só o cliente dono do pedido pode escrever.
create policy request_photos_select_involved on storage.objects
  for select using (
    bucket_id = 'request-photos'
    and exists (
      select 1 from public.service_requests sr
      where sr.id::text = (storage.foldername(name))[1]
        and (
          sr.client_id = auth.uid()
          or public.is_admin()
          or exists (
            select 1 from public.request_matches rm
            where rm.request_id = sr.id and rm.professional_id = auth.uid()
          )
        )
    )
  );

create policy request_photos_write_owner on storage.objects
  for insert with check (
    bucket_id = 'request-photos'
    and exists (
      select 1 from public.service_requests sr
      where sr.id::text = (storage.foldername(name))[1] and sr.client_id = auth.uid()
    )
  );
