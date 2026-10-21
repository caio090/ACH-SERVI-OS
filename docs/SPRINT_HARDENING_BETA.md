# Sprint de hardening do MVP + preparação do beta (20/10/2026)

Registro técnico do sprint. Plano de produto: `docs/ACHO_SERVICO_PLANO_MESTRE.md`.
Estado anterior da validação no banco real: `docs/VALIDACAO_SUPABASE_LIVE.md`.

## Como os testes rodam agora

- `npm test` — unitários + testes de banco (`src/test/*.db.test.ts`). Os testes
  de banco sobem um Postgres real em WASM (PGlite), aplicam **todas** as
  migrations de `supabase/migrations/` sobre um stub mínimo do Supabase
  (`src/test/supabaseStub.sql`: papéis anon/authenticated/service_role,
  `auth.uid()`, schema storage) e executam cada passo como o papel que o
  faria (RLS e triggers reais). Não usam rede nem o projeto real.
- `npm run e2e:supabase` — validação ponta a ponta contra o **projeto
  Supabase real** (Auth, RLS, Storage). Requer `.env.local` com as três chaves
  e confirmação explícita:

  ```bash
  E2E_CONFIRM=sim npm run e2e:supabase
  ```

  Cria 3 contas `[E2E]` (`e2e-<run>-*@acho-e2e.test`), executa as 21 etapas
  do fluxo + upload físico e apaga tudo no final. **Ainda não executado**:
  nesta máquina não há `.env.local`, e o conector Supabase disponível na
  sessão não tem acesso à organização do projeto `qaewckjhxmgjvfwwylvy`.

- `npm run build` exige `NEXT_PUBLIC_SUPABASE_URL` e
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (proteção intencional contra deploy sem
  configuração). Sem `.env.local`, valide o build com valores fictícios — o
  build não chama o Supabase:

  ```bash
  NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder npm run build
  ```

## Migrations novas (NÃO aplicadas no projeto real)

Aplicar em ordem, depois rodar o Security Advisor e `npm run e2e:supabase`.
Todas são aditivas: nenhuma apaga dados nem altera migration antiga.

| Migration | Objetivo | Tabelas/funções afetadas | RLS / permissões | Impacto |
| --- | --- | --- | --- | --- |
| `0015_appointment_insert_hardening` | **Corrige brecha**: cliente criava agendamento com match pendente/recusado pela API, forçando "aceito" e obtendo telefone/e-mail do profissional sem aceite. | trigger `validate_appointment_insert` em `appointments` | Exige pedido do próprio cliente, aberto, e match do mesmo pedido/profissional já aceito ou com proposta. Admin isento. | Nenhum para o fluxo legítimo (a UI só confirma matches aceitos). |
| `0016_rate_limiting` | Rate limit compartilhado sem Redis + limites no banco. | `private.rate_limit_counters`, `public.consume_rate_limit()`, triggers em `messages` e `reports`, 2 índices | RPC executável só por `service_role`; tabela no schema `private`. Limites: 30 msg/min por remetente, 10 denúncias/h. | Sem service role no app, o limite cai para memória do processo (fail-open logado). |
| `0017_admin_audit_log` | Audit log append-only gravado pelo banco. | `admin_action_logs` (policy, revokes, 2 índices), triggers `audit_admin_change` em 7 tabelas, `private.write_admin_log` | Admin só lê; update/delete bloqueados para todos os papéis da API (inclusive service_role). | Logs antigos preservados. App deixou de gravar log manualmente. |
| `0018_terms_acceptance` | Persistir aceite dos Termos/Privacidade. | `profiles.terms_version`, `profiles.terms_accepted_at`; `handle_new_user` | Sem mudança de policy. | Usuários existentes ficam com aceite nulo (cadastro anterior). |
| `0019_product_events` | Analytics interno do funil. | `product_events`, `admin_product_funnel()` | Escrita só backend (service role); leitura só admin. | Sem service role no app, eventos são ignorados. |
| `0020_beta_readiness` | Checklist de prontidão + métricas reais do piloto. | `beta_readiness_items` (+ seed de 28 itens), `admin_beta_metrics()` | Só admin lê/escreve; mudanças de status vão para o audit log. | Seed reflete o estado de 20/10/2026. |

## Achados da auditoria corrigidos neste sprint

1. Contato do profissional vazava sem aceite (0015) — **segurança, alta**.
2. Open redirect no login (`/entrar?redirect=//site-externo`).
3. Fotos do pedido nunca eram enviadas (o wizard só mostrava os nomes).
4. Limite de 1 MB das server actions quebraria qualquer upload de foto.
5. Tipo de upload confiava em extensão/Content-Type; nome original do arquivo ia para o Storage.
6. Excluir item do portfólio deixava o arquivo órfão no Storage.
7. Audit log editável/apagável por admin e com gravação sem checagem de erro.
8. Erros de server actions lançados (`throw`) chegam genéricos em produção — ações de usuário agora retornam mensagem.
9. `confirmMatch` deixava o pedido preso em "accepted" quando o agendamento falhava.

## Pendências conhecidas (fora do escopo ou bloqueadas)

- Login/cadastro passam pelo servidor do app: o rate limit nativo do
  Supabase Auth vê o IP do servidor, não do usuário. O limite por IP do app
  (hash) cobre o beta; revisar antes de escala.
- Cliente ainda pode inserir `request_matches` para qualquer profissional do
  próprio pedido via API (só gera notificação; profissional pode recusar).
- Usuário pode editar `terms_version` do próprio perfil via API (afeta só o
  próprio registro de aceite).
- Fotos de pedido só são removidas por service role (sem policy de delete
  para usuários) — retenção a definir na revisão jurídica.
