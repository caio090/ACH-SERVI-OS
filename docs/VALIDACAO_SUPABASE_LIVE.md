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

## Bloqueio de rede constatado (não é falha de credencial)

O sandbox onde este trabalho foi executado nega, por política de egress da
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

Consequência prática: **nenhuma chamada a este projeto real** (CLI
`supabase login/link/db push`, `psql`, ou a própria API HTTPS do projeto)
foi possível a partir deste sandbox. A integração MCP do Supabase disponível
nesta sessão também não tem acesso à organização dona deste projeto (só
enxerga a organização `lokat os`, que não é a usada aqui).

## O que foi feito mesmo assim (sem depender da rede)

1. **Migration `0009_security_hardening.sql`** criada em
   `supabase/migrations/` com o conteúdo exato fornecido — hardening de
   `search_path` e revogação/concessão mínima de `execute` nas funções
   expostas pela API. **Não foi reaplicada** no banco (já estava aplicada
   por integração externa, conforme instrução recebida).
2. **Migration `0010_public_view_hardening.sql`** criada em resposta ao
   aviso do Security Advisor sobre `public.public_professional_profiles`
   ("Security Definer View"). Análise (mapeamento de usos em
   `src/app/buscar`, `src/app/profissional/[id]`, `src/app/pedidos/[id]`,
   `src/app/pedidos/[id]/conversa/[professionalId]`): a view é
   intencionalmente security-definer para permitir busca pública com RLS
   restrita nas tabelas base; trocar para `security_invoker` quebraria a
   busca pública. A view já não seleciona `phone`/`email` e já respeita
   `is_active`/`is_suspended`. A migration apenas documenta a intenção via
   `comment on view` e reconfirma os grants mínimos — **nenhuma mudança de
   comportamento**.
3. **`src/lib/database.types.ts`** — adicionada a função
   `is_own_professional_profile` (existia no schema/migration 0003 e passou
   a ter `execute` concedido a `authenticated` pela 0009, mas estava
   ausente do arquivo de tipos). Demais tabelas/enums/view já batiam com o
   schema real informado.
4. **Testes automatizados mínimos** (`npm test`, Vitest) para as funções
   puras mais importantes: `src/lib/matching.ts` (20 casos, incluindo
   filtros de categoria/região/perfil incompleto/suspensão/pausa,
   disponibilidade com regra padrão e exceções, desempate por taxa de
   resposta e recência de agenda) e `src/lib/availability.ts` (próximo
   horário disponível, bloqueios por exceção, janela de 14 dias).
5. **Checagem visual local** (`npm run dev` + Chromium headless) das 10
   rotas principais: todas retornam 200, sem erros de hidratação/runtime.
   Rotas protegidas (`/pedidos`, `/pro/*`, `/admin`) redirecionam
   corretamente para `/entrar?redirect=...` quando não autenticado — o
   middleware funciona mesmo sem conexão real ao Supabase (a checagem de
   sessão falha de forma segura, tratada como "sem sessão"). Encontrado
   e corrigido um warning real do React em `NewRequestForm.tsx` (`encType`
   redundante/conflitante num `<form action={fn}>`).
6. `npm run lint`, `npm run typecheck`, `npm run build` e `npm test` — todos
   passando.

## O que NÃO foi possível validar (bloqueado pela rede, não pulado por escolha)

Todas as fases que exigem chamada real ao Supabase (Auth real, Storage real,
RLS testado contra dados reais, RPCs `get_appointment_contact` /
`get_request_client_name` / `is_admin` executados de verdade, fluxo E2E
cliente → profissional → agendamento → contato → conclusão → avaliação,
denúncia/admin reais, Advisor de performance) **não puderam ser executadas**
nesta sessão. Isso não significa que o código esteja incorreto — as regras
de RLS, RPCs e fluxo já foram desenhadas e revisadas por código (ver
`supabase/migrations/0005_rls_policies.sql` e `0008_contact_rpc.sql`) — mas
não há evidência de execução real contra o banco `qaewckjhxmgjvfwwylvy`
produzida por esta sessão.

## Como desbloquear

Uma das duas opções resolve tudo de uma vez:

1. Reautorizar a integração MCP do Supabase (nas configurações de
   conectores da própria plataforma) para incluir a organização dona do
   projeto `qaewckjhxmgjvfwwylvy`; ou
2. Rodar a validação (Fases 5–11 do prompt mestre desta fase) a partir de
   um ambiente sem esse bloqueio de egress — inclusive rodando localmente
   na própria máquina do desenvolvedor.
