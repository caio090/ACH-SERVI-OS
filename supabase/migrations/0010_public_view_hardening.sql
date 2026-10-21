-- ACHÔ SERVIÇO — resposta ao aviso do Security Advisor sobre
-- public.public_professional_profiles ("Security Definer View").
--
-- Análise (Fase 2 da sincronização pós-Supabase):
-- A view é intencionalmente "security definer" (sem security_invoker) para
-- permitir descoberta pública de profissionais mesmo com RLS restrita
-- ("dono ou admin") nas tabelas base profiles/professional_profiles. Trocar
-- para security_invoker faria a view retornar zero linhas para usuários
-- anônimos, quebrando a busca pública (/buscar, perfil público, respostas
-- de pedido) — não é uma correção segura, é uma regressão funcional.
--
-- A alternativa de abrir uma policy de SELECT público direto em
-- profiles/professional_profiles para contornar o advisor foi descartada:
-- isso exporia phone/email de profiles a qualquer client, já que RLS opera
-- por linha, não por coluna — violaria a regra de contato oculto
-- pré-confirmação do plano mestre.
--
-- Verificado nesta revisão: a view não seleciona phone nem email (nunca
-- selecionou — ver 0004_public_views.sql), e mantém os filtros
-- is_active = true e is_suspended = false. Nenhum uso em src/app/ (buscar,
-- profissional/[id], pedidos/[id], conversa) lê ou espera colunas de
-- contato através dela.
--
-- Ação tomada: nenhuma mudança de comportamento. Apenas tornamos explícita
-- a intenção na própria definição (em vez de depender do default implícito)
-- e reconfirmamos os grants mínimos, para reduzir ambiguidade em auditorias
-- futuras do Advisor.

comment on view public.public_professional_profiles is
  'View pública intencionalmente security-definer (sem security_invoker): expõe apenas colunas não sensíveis de profissionais ativos/não suspensos para descoberta pública, contornando a RLS restrita de professional_profiles/profiles. Nunca inclui phone/email. Ver 0010_public_view_hardening.sql para a análise completa.';

revoke all on public.public_professional_profiles from public;
grant select on public.public_professional_profiles to anon, authenticated;
