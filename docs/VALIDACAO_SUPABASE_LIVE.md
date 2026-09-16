# Validação Supabase real — registro

> Registro da tentativa de sincronizar e validar o ACHÔ SERVIÇO contra o
> projeto Supabase real. Ver `docs/ACHO_SERVICO_PLANO_MESTRE.md` para o plano
> de produto; este arquivo cobre apenas o estado técnico da conexão/validação.

## Projeto

- Nome: Achô Serviço
- Project ref: `qaewckjhxmgjvfwwylvy`
- Project URL: `https://qaewckjhxmgjvfwwylvy.supabase.co`
- `.env.local` configurado localmente com URL, anon key (`sb_publishable_...`)
  e service role key — nunca commitado (está em `.gitignore`).

## Estado validado no banco real (via integração Supabase externa)

O sandbox onde este repositório é trabalhado continua **sem** acesso de rede
ao projeto Supabase real (ver seção "Bloqueio de rede" abaixo — isso não
mudou). Uma integração Supabase externa, fora deste sandbox, tem acesso
direto ao projeto real e validou o banco na prática. O que segue é o estado
reportado por essa validação externa, sincronizado neste repositório como
migrations 0001–0014 e revisão de código correspondente:

- 15 tabelas públicas, todas com RLS habilitado.
- 15 categorias seed aplicadas.
- 3 buckets de Storage (`avatars`, `portfolio`, `request-photos`).
- 14 migrations aplicadas no banco real (`0001` a `0014`).
- Trigger de criação automática de `profiles` no signup funcionando.
- RPCs `get_request_client_name` e `get_appointment_contact` funcionando
  para os envolvidos; outsider recebe acesso negado; profissional
  notificado consegue ler o pedido; cliente alheio não consegue.
- Fluxo completo testado transacionalmente contra RLS real: pedido → match →
  aceite → appointment → in_service → completed → review → rating
  atualizado. Todos os dados de QA foram executados em transação com
  rollback — nenhum dado de teste ficou persistido no banco real.

Durante essa validação foram encontrados e corrigidos 3 problemas, cada um
com uma migration dedicada criada neste repositório (conteúdo sincronizado
a partir do que foi efetivamente aplicado no banco real, não reaplicado por
este sandbox):

1. **Recursão infinita entre RLS de `service_requests` e `request_matches`**
   — corrigida em `0011_rls_recursion_hardening.sql`: helpers
   `security definer` no schema `private` (não exposto via PostgREST)
   substituem as subqueries cruzadas diretas nas policies, quebrando o
   ciclo de avaliação.
2. **Profissional conseguia auto-verificar (`is_verified`) e forjar
   métricas de reputação (`average_rating`, `review_count`,
   `response_rate`)** — corrigido em
   `0012_professional_profile_managed_fields_hardening.sql` (trigger que
   reverte esses campos para o valor anterior quando quem edita não é
   admin) e ajustado em
   `0013_professional_metric_trigger_compatibility.sql` (permite que o
   trigger interno de recálculo de rating, que roda aninhado após uma
   review, continue funcionando via checagem de `pg_trigger_depth()`).
3. **Cliente conseguia alterar o status do appointment além do
   necessário** (a policy antiga só restringia por `client_id`/
   `professional_id`, não por transição válida) — corrigido em
   `0014_appointment_status_hardening.sql`: trigger
   `validate_appointment_status_actor` que, para não-admin, impede
   qualquer alteração de campos estruturais do agendamento
   (`request_id`, `request_match_id`, `client_id`, `professional_id`,
   `scheduled_date`, `time_window_start`, `time_window_end`,
   `contact_released_at`) e restringe a transição de `status` por papel:
   cliente só pode ir para `cancelled`; profissional só pode ir de
   `scheduled` para `in_service`/`cancelled`/`no_show` ou de `in_service`
   para `completed`/`cancelled`; admin sem restrição.

## Bloqueio de rede constatado no sandbox Claude (não é falha de credencial)

O sandbox onde este trabalho é executado nega, por política de egress da
organização, **todo** tráfego para o projeto Supabase real:

- `api.supabase.com:443` (Management API) → `403` no CONNECT do proxy.
- `qaewckjhxmgjvfwwylvy.supabase.co:443` (REST/Auth/Storage/RPC via HTTPS)
  → `403` no CONNECT do proxy.
- `db.qaewckjhxmgjvfwwylvy.supabase.co:5432` (Postgres direto) → host só
  resolve IPv6, sem rota IPv6 no sandbox.
- `aws-*.pooler.supabase.com:5432/6543` (connection pooler) → TCP timeout
  (porta não roteada, só HTTPS sai deste sandbox).

Confirmado via `curl http://127.0.0.1:<porta>/__agentproxy/status`, que lista
`qaewckjhxmgjvfwwylvy.supabase.co:443` em `recentRelayFailures` com
`"policy denial"`. Por instrução do próprio ambiente, negações de política
(403/407) não devem ser contornadas.

Consequência prática: nenhuma chamada a este projeto real (CLI
`supabase login/link/db push`, `psql`, ou a própria API HTTPS do projeto)
é possível a partir deste sandbox. A integração MCP do Supabase disponível
nesta sessão também não tem acesso à organização dona deste projeto (só
enxerga a organização `lokat os`, que não é a usada aqui).

## O que foi feito neste sandbox (sem depender da rede)

1. **Migrations `0009` e `0010`** (hardening de `search_path`/grants e
   documentação da view pública) — sincronizadas anteriormente, não
   reaplicadas (já estavam no banco real).
2. **Migrations `0011`–`0014`** (ver seção acima) — sincronizadas neste
   commit a partir do conteúdo exato aplicado pela integração externa no
   banco real. **Não foram reaplicadas** no banco.
3. **Revisão de código para compatibilidade com `0014`**:
   `src/lib/actions/professional.ts` (`updateAppointmentStatus`) agora
   busca o status atual do appointment, valida a transição pedida contra
   a mesma regra do trigger de banco (`isValidProfessionalAppointmentTransition`
   em `src/lib/appointmentTransitions.ts`) e confirma que quem chama é o
   profissional responsável — falhando cedo com uma mensagem clara em vez
   de depender só do erro genérico do Postgres. `src/app/pro/agenda/AppointmentActions.tsx`
   deixou de oferecer "Concluir atendimento" a partir de `scheduled` (essa
   transição direta agora é rejeitada pelo banco; o fluxo correto é
   `scheduled → in_service → completed`) e passou a oferecer "Cancelar"
   também a partir de `in_service`. Não havia UI cliente chamando
   `updateAppointmentStatus` com status diferente de cancelamento, então
   nenhuma tela de cliente precisou de ajuste. `confirmMatch` (em
   `src/lib/actions/requests.ts`) só faz `insert` de appointment (nunca
   `update`), então o novo trigger `before update` não afeta esse fluxo.
   Nenhum código do app altera `contact_released_at` ou outros campos
   estruturais do appointment após a criação — apenas `status`.
4. **Testes automatizados** (`npm test`, Vitest, 30 casos):
   - `src/lib/matching.ts` (15 casos) e `src/lib/availability.ts` (5
     casos) — já existentes.
   - `src/lib/appointmentTransitions.test.ts` (7 casos, novo) — espelha e
     testa a regra do trigger `validate_appointment_status_actor` (0014)
     em código puro: todas as transições válidas/inválidas por papel.
   - `src/lib/professionalManagedFields.test.ts` (3 casos, novo) —
     espelha e testa a regra do trigger
     `prevent_professional_managed_field_escalation` (0012/0013): bloqueio
     de auto-verificação/forjamento de métricas, permissão para admin e
     permissão para trigger interno aninhado.
   - Regressão da recursão de RLS (0011) **não** tem teste automatizado
     neste sandbox: recursão de policy é uma propriedade do plano de
     execução do Postgres avaliando policies umas contra as outras — não
     há uma função pura equivalente para isolar sem um Postgres real. A
     validação dessa correção é a execução real feita pela integração
     externa (fluxo completo sem erro de recursão), registrada acima.
5. **Checagem visual local** (`npm run dev` + Chromium headless) das rotas
   principais, feita em sessão anterior — sem regressão nesta sessão
   (mudança de UI foi só a condição de exibição dos botões em
   `AppointmentActions.tsx`, sem novo elemento).
6. `npm run lint`, `npm run typecheck`, `npm run build` e `npm test` — todos
   passando.

## O que ainda NÃO foi executado por este sandbox (bloqueado pela rede, não pulado por escolha)

Chamadas HTTP reais de Auth e upload físico de Storage contra o projeto
`qaewckjhxmgjvfwwylvy` **não foram executadas por este sandbox Claude**,
pelo bloqueio de rede descrito acima. As RPCs (`get_request_client_name`,
`get_appointment_contact`, `is_admin`, `is_own_professional_profile`) e as
policies de RLS principais foram testadas diretamente no banco pela
integração Supabase externa (ver seção "Estado validado no banco real"),
não por este sandbox.

## Security Advisor

Estado conhecido (não alterado por 0011–0014):

- **1 ERROR**: `public.public_professional_profiles` como "Security
  Definer View" — deliberado e documentado em `0010`, pois a view expõe
  apenas campos públicos, filtra profissional ativo/não suspenso e nunca
  seleciona `phone`/`email`.
- **4 WARN**: funções `security definer` autenticadas
  (`get_appointment_contact`, `get_request_client_name`, `is_admin`,
  `is_own_professional_profile`) — intencionais; as RPCs de contato
  validam envolvimento internamente antes de liberar dados.

Nenhuma alteração apressada foi feita só para zerar o linter do Advisor.

## Como desbloquear o sandbox Claude (se necessário no futuro)

Uma das duas opções resolve tudo de uma vez:

1. Reautorizar a integração MCP do Supabase (nas configurações de
   conectores da própria plataforma) para incluir a organização dona do
   projeto `qaewckjhxmgjvfwwylvy`; ou
2. Rodar a validação HTTP/Storage a partir de um ambiente sem esse
   bloqueio de egress — inclusive rodando localmente na própria máquina
   do desenvolvedor.
