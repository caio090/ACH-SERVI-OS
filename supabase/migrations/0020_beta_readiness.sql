-- ACHÔ SERVIÇO — prontidão do beta e métricas operacionais do piloto.
--
-- 1) beta_readiness_items: checklist editável pelos admins (status + nota).
--    Os itens iniciais refletem o estado real em 20/10/2026, ao fim do sprint
--    de hardening — o que depende do projeto Supabase real fica "blocked" até
--    ser validado lá. O progresso é calculado no app a partir dos status.
-- 2) admin_beta_metrics(): contagens reais do piloto direto das tabelas
--    (nada de número fixo no código). Apenas admin.

create table public.beta_readiness_items (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in (
    'produto', 'tecnologia', 'seguranca', 'operacao', 'juridico', 'comercial', 'marketing', 'piloto'
  )),
  title text not null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'blocked', 'done')),
  notes text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  unique (category, title)
);

comment on table public.beta_readiness_items is 'Checklist de prontidão do beta, mantido pelos admins em /admin/prontidao.';

alter table public.beta_readiness_items enable row level security;

create policy beta_readiness_items_select_admin on public.beta_readiness_items
  for select to authenticated using (public.is_admin());
create policy beta_readiness_items_write_admin on public.beta_readiness_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.beta_readiness_items from anon;

create or replace function public.touch_beta_readiness_item()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger touch_beta_readiness_item
  before insert or update on public.beta_readiness_items
  for each row execute function public.touch_beta_readiness_item();

-- Auditoria das mudanças de status (mesmo log append-only de 0017).
create or replace function public.audit_beta_readiness_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if auth.uid() is not null and public.is_admin()
     and (new.status is distinct from old.status or new.notes is distinct from old.notes) then
    perform private.write_admin_log('beta_readiness.updated', 'beta_readiness_item', new.id,
      jsonb_build_object('title', new.title, 'from', old.status, 'to', new.status));
  end if;
  return new;
end;
$$;

create trigger audit_beta_readiness_change
  after update on public.beta_readiness_items
  for each row execute function public.audit_beta_readiness_change();

revoke execute on function public.touch_beta_readiness_item() from public, anon, authenticated;
revoke execute on function public.audit_beta_readiness_change() from public, anon, authenticated;

insert into public.beta_readiness_items (category, title, status, notes, sort_order) values
  ('produto', 'Fluxo do cliente coberto por teste automatizado (Postgres com todas as migrations e RLS)', 'done', 'src/test/mvpFlow.db.test.ts', 10),
  ('produto', 'Fluxo do cliente validado no projeto Supabase real', 'blocked', 'Aguardando credenciais/.env.local ou acesso do conector ao projeto.', 20),
  ('produto', 'Fluxo do profissional validado no projeto Supabase real', 'blocked', 'Aguardando credenciais/.env.local ou acesso do conector ao projeto.', 30),
  ('produto', 'Chat validado no projeto Supabase real', 'blocked', 'Aguardando credenciais/.env.local ou acesso do conector ao projeto.', 40),
  ('produto', 'Upload de fotos validado no projeto Supabase real', 'blocked', 'Implementado e validado por teste; falta upload físico no Storage real.', 50),
  ('tecnologia', 'Testes, lint, typecheck e build passando', 'done', '', 10),
  ('tecnologia', 'Migrations 0015–0020 aplicadas no Supabase', 'not_started', 'Aplicar na ordem; atualizar este item depois.', 20),
  ('tecnologia', 'Variáveis de ambiente de produção configuradas (incl. service role)', 'not_started', 'Sem service role o rate limit cai para memória e os eventos não são gravados.', 30),
  ('tecnologia', 'Deploy de preview (Vercel)', 'not_started', '', 40),
  ('tecnologia', 'Domínio próprio', 'not_started', '', 50),
  ('seguranca', 'RLS revisada (inclui brecha de agendamento corrigida em 0015)', 'in_progress', 'Correção escrita e testada; falta aplicar no banco real.', 10),
  ('seguranca', 'Rate limiting', 'in_progress', 'Código e migration 0016 prontos; ativo após aplicar e configurar service role.', 20),
  ('seguranca', 'Audit log administrativo append-only', 'in_progress', 'Migration 0017 pronta; ativo após aplicar.', 30),
  ('seguranca', 'Security Advisor revisado após as novas migrations', 'not_started', '', 40),
  ('operacao', 'Rotina diária definida (pedidos sem resposta, agenda velha, cancelamentos, denúncias)', 'not_started', '', 10),
  ('operacao', 'Canal de suporte definido', 'not_started', '', 20),
  ('juridico', 'Termos de Uso (rascunho publicado em /termos)', 'in_progress', 'Versão para revisão jurídica.', 10),
  ('juridico', 'Política de Privacidade (rascunho publicado em /privacidade)', 'in_progress', 'Versão para revisão jurídica.', 20),
  ('juridico', 'Razão social, CNPJ e contato do controlador definidos', 'not_started', 'Aparecem como pendência nos documentos.', 30),
  ('juridico', 'Revisão jurídica dos documentos', 'not_started', '', 40),
  ('juridico', 'Revisão tributária/contábil antes da monetização', 'not_started', '', 50),
  ('comercial', 'Categorias piloto definidas', 'not_started', '', 10),
  ('comercial', 'Profissionais piloto recrutados', 'not_started', '', 20),
  ('marketing', 'Home mobile-first e marca', 'in_progress', '', 10),
  ('marketing', 'Plano de microinfluenciadores locais', 'not_started', '', 20),
  ('piloto', 'Cidade e bairros piloto definidos', 'not_started', '', 10),
  ('piloto', 'Clientes piloto convidados', 'not_started', '', 20),
  ('piloto', 'Métricas do funil coletando em produção', 'in_progress', 'Código pronto (0019); depende de deploy + service role.', 30);

-- -------------------------------------------------------------------------
-- Métricas operacionais do piloto (dados reais, só admin)
-- -------------------------------------------------------------------------
create or replace function public.admin_beta_metrics()
returns table (
  clients_registered bigint,
  professionals_registered bigint,
  professionals_verified bigint,
  requests_open bigint,
  requests_with_match bigint,
  appointments_total bigint,
  services_completed bigint,
  reviews_total bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'acesso negado';
  end if;

  return query select
    (select count(*) from public.profiles p
      where p.role = 'client' and not exists (select 1 from public.professional_profiles pp where pp.id = p.id)),
    (select count(*) from public.professional_profiles),
    (select count(*) from public.professional_profiles where is_verified),
    (select count(*) from public.service_requests where status in ('open', 'reviewing')),
    (select count(distinct request_id) from public.request_matches),
    (select count(*) from public.appointments),
    (select count(*) from public.appointments where status = 'completed'),
    (select count(*) from public.reviews);
end;
$$;

revoke execute on function public.admin_beta_metrics() from public, anon, authenticated;
grant execute on function public.admin_beta_metrics() to authenticated;
