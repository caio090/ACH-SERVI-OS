-- ACHÔ SERVIÇO — eventos de produto para o funil (analytics interno).
--
-- Gravação só pelo backend (service role): o navegador envia para
-- POST /api/events, que valida, limita (429) e grava. Usuários comuns não
-- leem nem escrevem nesta tabela. metadata é objeto pequeno, sem dado pessoal
-- (o app filtra as chaves por evento — src/lib/analytics.ts).

create table public.product_events (
  id bigint generated always as identity primary key,
  event_name text not null check (event_name in (
    'home_view', 'search_started', 'category_selected', 'request_started',
    'request_submitted', 'professional_matched', 'professional_accepted',
    'appointment_confirmed', 'service_started', 'service_completed', 'review_submitted'
  )),
  user_id uuid references public.profiles (id) on delete set null,
  anonymous_id uuid,
  request_id uuid references public.service_requests (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 1024),
  created_at timestamptz not null default now()
);

comment on table public.product_events is 'Eventos de produto para métricas de funil. Escrita só pelo backend; leitura só admin.';

create index product_events_name_created_idx on public.product_events (event_name, created_at desc);
create index product_events_created_idx on public.product_events (created_at desc);

alter table public.product_events enable row level security;

create policy product_events_select_admin on public.product_events
  for select to authenticated
  using (public.is_admin());

revoke insert, update, delete, truncate on public.product_events from anon, authenticated;

-- Funil: por evento, quantos atores distintos (conta ou navegador anônimo) e
-- quantos eventos no período. Apenas admin.
create or replace function public.admin_product_funnel(p_since timestamptz)
returns table (event_name text, actors bigint, events bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'acesso negado';
  end if;

  return query
    select
      pe.event_name,
      count(distinct coalesce(pe.user_id::text, pe.anonymous_id::text, pe.id::text)) as actors,
      count(*) as events
    from public.product_events pe
    where pe.created_at >= p_since
    group by pe.event_name;
end;
$$;

revoke execute on function public.admin_product_funnel(timestamptz) from public, anon, authenticated;
grant execute on function public.admin_product_funnel(timestamptz) to authenticated;
