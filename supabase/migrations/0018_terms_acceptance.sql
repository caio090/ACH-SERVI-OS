-- ACHÔ SERVIÇO — aceite dos Termos de Uso e da Política de Privacidade.
--
-- O cadastro exige marcar o aceite; a versão aceita e o momento ficam no
-- perfil. Os valores chegam como metadata do signup (auth.users.
-- raw_user_meta_data.terms_version) e são copiados pelo handle_new_user.
-- O horário do aceite é o do servidor do banco, não o enviado pelo cliente.

alter table public.profiles
  add column terms_version text,
  add column terms_accepted_at timestamptz;

comment on column public.profiles.terms_version is 'Versão dos Termos/Privacidade aceita no cadastro (src/lib/legal.ts LEGAL_VERSION).';
comment on column public.profiles.terms_accepted_at is 'Momento do aceite (relógio do banco).';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted_version text := nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'terms_version', '')), 40), '');
begin
  insert into public.profiles (id, full_name, email, terms_version, terms_accepted_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    accepted_version,
    case when accepted_version is not null then now() end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
