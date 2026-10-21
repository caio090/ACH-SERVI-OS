-- ACHÔ SERVIÇO — Row Level Security
-- Ver docs/ACHO_SERVICO_PLANO_MESTRE.md seção "Segurança" (RLS obrigatória).
-- Regra geral: cada tabela com dado de usuário tem RLS habilitada e nenhuma
-- policy "allow all". Nunca desabilitar RLS como solução permanente.

alter table public.profiles enable row level security;
alter table public.professional_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.professional_categories enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.service_requests enable row level security;
alter table public.request_matches enable row level security;
alter table public.appointments enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.reviews enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.admin_action_logs enable row level security;

-- =========================================================================
-- profiles — cliente só lê/edita o próprio; admin lê/edita todos.
-- Dado de contato pessoal nunca é exposto publicamente por aqui (sem policy
-- pública de select); descoberta pública usa a view public_professional_profiles.
-- =========================================================================
create policy profiles_select_own_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());

create policy profiles_update_own_or_admin on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- =========================================================================
-- professional_profiles — próprio profissional ou admin.
-- Descoberta pública passa pela view public_professional_profiles.
-- =========================================================================
create policy professional_profiles_select_own_or_admin on public.professional_profiles
  for select using (id = auth.uid() or public.is_admin());

create policy professional_profiles_insert_own on public.professional_profiles
  for insert with check (id = auth.uid());

create policy professional_profiles_update_own_or_admin on public.professional_profiles
  for update using (id = auth.uid() or public.is_admin());

-- =========================================================================
-- categories — leitura pública (taxonomia não sensível); escrita só admin.
-- =========================================================================
create policy categories_select_public on public.categories
  for select using (true);

create policy categories_write_admin on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- =========================================================================
-- professional_categories — leitura pública; escrita pelo próprio profissional.
-- =========================================================================
create policy professional_categories_select_public on public.professional_categories
  for select using (true);

create policy professional_categories_write_own on public.professional_categories
  for all
  using (professional_id = auth.uid() or public.is_admin())
  with check (professional_id = auth.uid() or public.is_admin());

-- =========================================================================
-- availability_rules / availability_exceptions — leitura pública (horário de
-- atendimento não é dado pessoal sensível, usado para mostrar "próximo
-- horário" no perfil público); escrita pelo próprio profissional.
-- =========================================================================
create policy availability_rules_select_public on public.availability_rules
  for select using (true);

create policy availability_rules_write_own on public.availability_rules
  for all
  using (professional_id = auth.uid() or public.is_admin())
  with check (professional_id = auth.uid() or public.is_admin());

create policy availability_exceptions_select_public on public.availability_exceptions
  for select using (true);

create policy availability_exceptions_write_own on public.availability_exceptions
  for all
  using (professional_id = auth.uid() or public.is_admin())
  with check (professional_id = auth.uid() or public.is_admin());

-- =========================================================================
-- service_requests — cliente dono, profissional notificado (via
-- request_matches), ou admin.
-- =========================================================================
create policy service_requests_select_involved on public.service_requests
  for select using (
    client_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.request_matches rm
      where rm.request_id = service_requests.id and rm.professional_id = auth.uid()
    )
  );

create policy service_requests_insert_own on public.service_requests
  for insert with check (client_id = auth.uid());

create policy service_requests_update_own_or_admin on public.service_requests
  for update using (client_id = auth.uid() or public.is_admin());

-- =========================================================================
-- request_matches — profissional vê/responde os seus; cliente vê os do seu
-- pedido e pode criar (matching é disparado pelo cliente ao abrir o pedido,
-- atribuindo profissionais elegíveis); admin tudo.
-- =========================================================================
create policy request_matches_select_involved on public.request_matches
  for select using (
    professional_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.service_requests sr
      where sr.id = request_matches.request_id and sr.client_id = auth.uid()
    )
  );

create policy request_matches_insert_by_request_owner on public.request_matches
  for insert with check (
    public.is_admin()
    or exists (
      select 1 from public.service_requests sr
      where sr.id = request_id and sr.client_id = auth.uid()
    )
  );

create policy request_matches_update_own_professional_or_admin on public.request_matches
  for update using (professional_id = auth.uid() or public.is_admin());

-- =========================================================================
-- appointments — cliente e profissional envolvidos, ou admin.
-- Criação: cliente confirma (a criação do appointment é o gatilho de
-- liberação de contato — ver trigger sync_request_status_on_appointment_insert).
-- =========================================================================
create policy appointments_select_involved on public.appointments
  for select using (
    client_id = auth.uid() or professional_id = auth.uid() or public.is_admin()
  );

create policy appointments_insert_by_client on public.appointments
  for insert with check (client_id = auth.uid() or public.is_admin());

create policy appointments_update_involved on public.appointments
  for update using (
    client_id = auth.uid() or professional_id = auth.uid() or public.is_admin()
  );

-- =========================================================================
-- portfolio_items — leitura pública; escrita pelo próprio profissional.
-- =========================================================================
create policy portfolio_items_select_public on public.portfolio_items
  for select using (true);

create policy portfolio_items_write_own on public.portfolio_items
  for all
  using (professional_id = auth.uid() or public.is_admin())
  with check (professional_id = auth.uid() or public.is_admin());

-- =========================================================================
-- reviews — leitura pública (prova social); criação só pelo cliente do
-- atendimento concluído (reforçado pelo trigger validate_review_eligibility);
-- sem update; delete restrito a admin (moderação).
-- =========================================================================
create policy reviews_select_public on public.reviews
  for select using (true);

create policy reviews_insert_own_client on public.reviews
  for insert with check (client_id = auth.uid());

create policy reviews_delete_admin on public.reviews
  for delete using (public.is_admin());

-- =========================================================================
-- conversations — só cliente e profissional do pedido; criação por qualquer
-- um dos dois lados, desde que vinculados ao pedido.
-- =========================================================================
create policy conversations_select_involved on public.conversations
  for select using (
    client_id = auth.uid() or professional_id = auth.uid() or public.is_admin()
  );

create policy conversations_insert_involved on public.conversations
  for insert with check (
    public.is_admin()
    or (
      client_id = auth.uid()
      and exists (
        select 1 from public.service_requests sr
        where sr.id = request_id and sr.client_id = auth.uid()
      )
    )
    or (
      professional_id = auth.uid()
      and exists (
        select 1 from public.request_matches rm
        where rm.request_id = conversations.request_id and rm.professional_id = auth.uid()
      )
    )
  );

-- =========================================================================
-- messages — só participantes da conversa; remetente deve ser o próprio
-- usuário autenticado.
-- =========================================================================
create policy messages_select_involved on public.messages
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.client_id = auth.uid() or c.professional_id = auth.uid())
    )
  );

create policy messages_insert_involved on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.client_id = auth.uid() or c.professional_id = auth.uid())
    )
  );

-- =========================================================================
-- reports — usuário cria e vê as próprias denúncias; admin vê e resolve tudo.
-- =========================================================================
create policy reports_select_own_or_admin on public.reports
  for select using (reporter_id = auth.uid() or public.is_admin());

create policy reports_insert_own on public.reports
  for insert with check (reporter_id = auth.uid());

create policy reports_update_admin on public.reports
  for update using (public.is_admin());

-- =========================================================================
-- admin_action_logs — restrito a admins.
-- =========================================================================
create policy admin_action_logs_admin_only on public.admin_action_logs
  for all using (public.is_admin()) with check (public.is_admin());
