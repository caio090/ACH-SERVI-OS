-- ACHÔ SERVIÇO — rate limiting do beta.
--
-- 1) Contador compartilhado para o app (janela fixa), consumido pelo backend
--    via RPC public.consume_rate_limit com service role. Substitui a
--    necessidade de Redis/Upstash no MVP. As chaves são do tipo
--    "acao:user:<uuid>" ou "acao:ip:<hash>" — IP bruto nunca é gravado.
-- 2) Limites no próprio banco para escritas que um usuário logado consegue
--    fazer direto pela API do Supabase sem passar pelo app (mensagens e
--    denúncias), complementando o cooldown de pedidos de 0003.

create table private.rate_limit_counters (
  bucket_key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket_key, window_start)
);

comment on table private.rate_limit_counters is 'Contadores de rate limit (janela fixa). Schema private: não exposto pela API.';

alter table private.rate_limit_counters enable row level security;
revoke all on private.rate_limit_counters from public, anon, authenticated;

create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_window_start timestamptz;
  v_hits integer;
begin
  if p_key is null or length(p_key) = 0 or length(p_key) > 200
     or p_limit is null or p_limit < 1
     or p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'parâmetros de rate limit inválidos';
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into private.rate_limit_counters as c (bucket_key, window_start, hits)
  values (p_key, v_window_start, 1)
  on conflict (bucket_key, window_start) do update set hits = c.hits + 1
  returning c.hits into v_hits;

  -- Limpeza oportunista de janelas antigas (~1% das chamadas).
  if random() < 0.01 then
    delete from private.rate_limit_counters where window_start < now() - interval '2 days';
  end if;

  return query select
    v_hits <= p_limit,
    greatest(p_limit - v_hits, 0),
    case
      when v_hits <= p_limit then 0
      else greatest(1, ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - now())))::integer)
    end;
end;
$$;

revoke execute on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

-- =========================================================================
-- Limites no banco: mensagens (30/min por remetente) e denúncias (10/h)
-- =========================================================================
create index if not exists messages_sender_created_idx on public.messages (sender_id, created_at desc);
create index if not exists reports_reporter_created_idx on public.reports (reporter_id, created_at desc);

create or replace function public.enforce_message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if (
    select count(*) from public.messages
    where sender_id = new.sender_id and created_at > now() - interval '1 minute'
  ) >= 30 then
    raise exception 'limite de mensagens atingido, aguarde um instante';
  end if;
  return new;
end;
$$;

create trigger enforce_message_rate_limit_before_insert
  before insert on public.messages
  for each row execute function public.enforce_message_rate_limit();

create or replace function public.enforce_report_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if (
    select count(*) from public.reports
    where reporter_id = new.reporter_id and created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'limite de denúncias atingido, tente novamente mais tarde';
  end if;
  return new;
end;
$$;

create trigger enforce_report_rate_limit_before_insert
  before insert on public.reports
  for each row execute function public.enforce_report_rate_limit();

revoke execute on function public.enforce_message_rate_limit() from public, anon, authenticated;
revoke execute on function public.enforce_report_rate_limit() from public, anon, authenticated;
