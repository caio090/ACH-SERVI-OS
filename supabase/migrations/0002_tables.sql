-- ACHÔ SERVIÇO — tabelas do MVP
-- Todas as tabelas com dado de usuário recebem RLS na migration 0004.

-- =========================================================================
-- profiles
-- =========================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  email text,
  role user_role not null default 'client',
  avatar_path text,
  city text,
  neighborhood text,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Dados do usuário autenticado. 1:1 com auth.users.';

-- =========================================================================
-- professional_profiles
-- =========================================================================
create table public.professional_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  bio text not null default '',
  service_areas text[] not null default '{}',
  service_radius_km numeric(5, 1),
  is_active boolean not null default true,
  is_verified boolean not null default false,
  average_rating numeric(3, 2) not null default 0,
  review_count integer not null default 0,
  response_rate numeric(5, 2) not null default 0,
  last_availability_update timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.professional_profiles is 'Extensão de profile para usuários que atuam como profissionais.';
comment on column public.professional_profiles.is_active is 'false = profissional pausou recebimento de novos pedidos.';
comment on column public.professional_profiles.service_areas is 'Bairros/regiões atendidos (texto livre), usado no matching por região.';

-- =========================================================================
-- categories
-- =========================================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text not null default '🛠️',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- professional_categories
-- =========================================================================
create table public.professional_categories (
  professional_id uuid not null references public.professional_profiles (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (professional_id, category_id)
);

-- =========================================================================
-- availability_rules (agenda padrão recorrente)
-- =========================================================================
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint availability_rules_time_order check (end_time > start_time)
);

comment on column public.availability_rules.weekday is '0 = domingo ... 6 = sábado.';

-- =========================================================================
-- availability_exceptions (exceções pontuais: bloqueio ou abertura extra)
-- =========================================================================
create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles (id) on delete cascade,
  exception_date date not null,
  is_available boolean not null default false,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default now(),
  constraint availability_exceptions_time_order check (
    start_time is null or end_time is null or end_time > start_time
  )
);

comment on column public.availability_exceptions.is_available is 'false = bloqueio (folga/indisponível); true = abertura extra fora da regra padrão.';

-- =========================================================================
-- service_requests
-- =========================================================================
create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.categories (id),
  description text not null,
  neighborhood text not null,
  city text not null,
  desired_date date not null,
  time_window_start time not null,
  time_window_end time not null,
  is_urgent boolean not null default false,
  photo_paths text[] not null default '{}',
  status service_request_status not null default 'draft',
  accepted_match_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_requests_time_order check (time_window_end > time_window_start)
);

comment on table public.service_requests is 'Pedido criado pelo cliente. accepted_match_id aponta para o request_matches confirmado.';

-- =========================================================================
-- request_matches
-- =========================================================================
create table public.request_matches (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  professional_id uuid not null references public.professional_profiles (id) on delete cascade,
  status request_match_status not null default 'pending',
  proposed_date date,
  proposed_time_window_start time,
  proposed_time_window_end time,
  decline_reason text,
  notified_at timestamptz not null default now(),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (request_id, professional_id)
);

comment on table public.request_matches is 'Um profissional elegível notificado sobre um pedido, e a resposta dele.';

alter table public.service_requests
  add constraint service_requests_accepted_match_fk
  foreign key (accepted_match_id) references public.request_matches (id) on delete set null;

-- =========================================================================
-- appointments
-- =========================================================================
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.service_requests (id) on delete cascade,
  request_match_id uuid not null references public.request_matches (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  professional_id uuid not null references public.professional_profiles (id) on delete cascade,
  scheduled_date date not null,
  time_window_start time not null,
  time_window_end time not null,
  status appointment_status not null default 'scheduled',
  contact_released_at timestamptz not null default now(),
  service_address text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint appointments_time_order check (time_window_end > time_window_start)
);

comment on table public.appointments is 'Agendamento confirmado. Sua criação é o gatilho de liberação de contato.';

-- =========================================================================
-- portfolio_items
-- =========================================================================
create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles (id) on delete cascade,
  title text not null default '',
  description text not null default '',
  photo_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- reviews
-- =========================================================================
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  professional_id uuid not null references public.professional_profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.reviews is 'Avaliação do cliente sobre o profissional, exige appointment concluído.';

-- =========================================================================
-- conversations
-- =========================================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  professional_id uuid not null references public.professional_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (request_id, professional_id)
);

-- =========================================================================
-- messages
-- =========================================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- =========================================================================
-- reports
-- =========================================================================
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type report_target_type not null,
  target_id uuid not null,
  reason text not null,
  status report_status not null default 'open',
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- admin_action_logs
-- Exigido pela seção de Segurança do plano mestre ("Logs de ações
-- administrativas"), embora não listado nas "entidades mínimas".
-- =========================================================================
create table public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id),
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- índices de suporte às consultas mais comuns
-- =========================================================================
create index service_requests_client_id_idx on public.service_requests (client_id);
create index service_requests_category_id_idx on public.service_requests (category_id);
create index service_requests_status_idx on public.service_requests (status);
create index request_matches_request_id_idx on public.request_matches (request_id);
create index request_matches_professional_id_idx on public.request_matches (professional_id);
create index appointments_professional_id_idx on public.appointments (professional_id);
create index appointments_client_id_idx on public.appointments (client_id);
create index portfolio_items_professional_id_idx on public.portfolio_items (professional_id);
create index reviews_professional_id_idx on public.reviews (professional_id);
create index messages_conversation_id_idx on public.messages (conversation_id);
create index professional_categories_category_id_idx on public.professional_categories (category_id);
create index availability_rules_professional_id_idx on public.availability_rules (professional_id);
