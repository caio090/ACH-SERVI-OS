# ACHÔ SERVIÇO

> "Precisou? Achô."

Marketplace local que conecta clientes e profissionais de serviços. Este repositório
contém a base do MVP (web app), descrita em detalhe em
[`docs/ACHO_SERVICO_PLANO_MESTRE.md`](./docs/ACHO_SERVICO_PLANO_MESTRE.md) — leia esse
documento antes de propor mudanças de regra de negócio.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS
- [Supabase](https://supabase.com) (Postgres + Auth + Storage)
- Deploy alvo: Vercel

## Setup local

### 1. Pré-requisitos

- Node.js 20+
- Uma conta/projeto no [Supabase](https://supabase.com)

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha com as credenciais do seu projeto
Supabase (Project Settings → API):

```bash
cp .env.example .env.local
```

Variáveis necessárias:

| Variável | Descrição |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (anon) do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de service role — apenas para rotas server-side administrativas, nunca exposta ao cliente |
| `NEXT_PUBLIC_SITE_URL` | URL pública do site (ex.: `http://localhost:3000`) |

### 4. Aplicar o schema do banco

As migrations SQL estão em `supabase/migrations/`. Aplique-as na ordem, via
[Supabase CLI](https://supabase.com/docs/guides/local-development) ou colando o
conteúdo no SQL Editor do painel Supabase:

```bash
supabase link --project-ref <seu-project-ref>
supabase db push
```

### 5. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Ambiente de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Sobe o build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Checagem de tipos TypeScript |
| `npm test` | Unitários + testes de banco (Postgres local em WASM com todas as migrations e RLS) |
| `npm run e2e:supabase` | Fluxo completo contra o projeto Supabase real (exige `.env.local` e `E2E_CONFIRM=sim`) |

Detalhes do sprint de hardening, migrations pendentes de aplicação e como validar: [`docs/SPRINT_HARDENING_BETA.md`](./docs/SPRINT_HARDENING_BETA.md).

## Estrutura

```
src/app/            rotas (App Router): cliente, profissional, admin, auth
src/components/     componentes de UI reutilizáveis
src/lib/            clientes Supabase, matching, tipos e constantes de domínio
supabase/migrations/ schema SQL + políticas RLS, em ordem de aplicação
docs/               plano mestre do produto (fonte de verdade)
```

## Escopo do MVP

Ciclo completo implementado: cliente cria pedido → profissionais elegíveis recebem →
profissional aceita/recusa/sugere horário → cliente confirma → agendamento é criado →
contato é liberado → serviço é concluído → cliente avalia.

**Fora de escopo nesta fase:** pagamento do serviço, carteira, comissão percentual, app
nativo, assinatura paga. Veja detalhes em `docs/ACHO_SERVICO_PLANO_MESTRE.md`.
