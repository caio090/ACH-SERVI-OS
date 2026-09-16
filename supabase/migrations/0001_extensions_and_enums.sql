-- ACHÔ SERVIÇO — extensões e enums do domínio
-- Ver docs/ACHO_SERVICO_PLANO_MESTRE.md para a definição de cada estado.

create extension if not exists "pgcrypto";

create type user_role as enum ('client', 'professional', 'admin');

create type service_request_status as enum (
  'draft',
  'open',
  'reviewing',
  'accepted',
  'scheduled',
  'in_service',
  'completed',
  'cancelled',
  'expired'
);

create type request_match_status as enum (
  'pending',
  'accepted',
  'declined',
  'proposed_new_time',
  'expired'
);

create type appointment_status as enum (
  'scheduled',
  'in_service',
  'completed',
  'cancelled',
  'no_show'
);

create type report_status as enum ('open', 'reviewed', 'dismissed', 'actioned');

create type report_target_type as enum ('user', 'service_request', 'review', 'message');
