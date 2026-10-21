# ACHÔ SERVIÇO — estado real do projeto

Atualizado em 21/10/2026 (fim do B1.1). Branch `claude/acho-servico-mvp-base-w3pj7h`.

Legenda — **PRONTO**: implementado e coberto por teste. **PARCIAL**: existe, mas
falta parte relevante ou validação. **NÃO INICIADO**: não há código.
**BLOQUEADO**: depende de algo externo ao código.

> Ressalva que vale para tudo abaixo: o código foi validado num Postgres local
> com todas as migrations, RLS e triggers (`npm test`), mas **nunca rodou contra
> o projeto Supabase real** (`qaewckjhxmgjvfwwylvy`). As migrations 0015–0020
> não foram aplicadas lá e o teste ponta a ponta real (`npm run e2e:supabase`)
> não foi executado — falta `.env.local` com as chaves.

## Cliente

| Item | Estado | Observação |
| --- | --- | --- |
| Home mobile-first (saudação, busca, categorias, CTA, pedidos) | PRONTO | Com logo oficial no header. |
| Buscar (`/buscar`) | PRONTO | Busca por tipo de serviço e por problema ("tomada" → Eletricista) sobre categorias reais. |
| Pedido em etapas (`/pedir`) | PARCIAL | Categoria → descrição/urgência/fotos → bairro/cidade → data/período → revisão, com voltar, editar, rascunho salvo e cancelar. Criação real no banco não testada contra o Supabase real. |
| Fotos do pedido | PARCIAL | Compressão no navegador + validação por conteúdo + bucket privado. Upload físico real não testado. |
| Meus pedidos (`/pedidos`) | PRONTO | Abas Em andamento / Concluídos, estado vazio real. |
| Detalhe do pedido + timeline | PRONTO | Timeline mapeada nos status reais do banco. |
| Confirmar profissional / agendamento | PARCIAL | Implementado; regra de aceite reforçada no banco (0015, não aplicada). |
| Chat | PARCIAL | Implementado (cliente ↔ profissional por pedido); sem tempo real (recarrega a página). |
| Avaliação | PARCIAL | Implementada; só após atendimento concluído. |
| Perfil do cliente | NÃO INICIADO | "Perfil" na barra inferior leva para login/pedidos; não há tela de perfil/edição de dados. |
| Cadastro / login | PARCIAL | Com aceite de termos e rate limit; não validado no Auth real. Sem recuperação de senha. |

## Profissional (próximo módulo: B2)

| Item | Estado | Observação |
| --- | --- | --- |
| Onboarding / perfil profissional (`/pro/onboarding`, `/pro/perfil`) | PARCIAL | Categorias, bairros, bio, pausar recebimento. |
| Painel / oportunidades (`/pro/painel`, `/pro/pedidos/[id]`) | PARCIAL | Lista de matches; aceitar, recusar ou sugerir outro horário. |
| Agenda (`/pro/agenda`) | PARCIAL | Regras semanais, exceções, iniciar/concluir atendimento. |
| Portfólio (`/pro/portfolio`) | PARCIAL | Upload validado; exclusão remove o arquivo. |
| Atendimentos (histórico) | NÃO INICIADO | Não há tela dedicada. |
| Estrutura de rotas do B2 | — | Área logada do profissional hoje é `/pro/*`; `/profissional/[id]` é o perfil **público**. Decidir antes do B2 se mantém `/pro` ou migra (evitar conflito de rota). |

## Admin

| Item | Estado | Observação |
| --- | --- | --- |
| Painel com métricas reais do piloto + funil 30 dias | PARCIAL | Depende das migrations 0019/0020 aplicadas. |
| Usuários, profissionais (verificar), categorias, pedidos, avaliações, denúncias | PARCIAL | Telas existentes; ações com rate limit e auditoria. |
| Auditoria (`/admin/auditoria`) | PARCIAL | Log append-only gravado pelo banco (0017, não aplicada). |
| Prontidão do Beta (`/admin/prontidao`) | PARCIAL | 0020, não aplicada. |
| Tarifas / simulação | NÃO INICIADO | Ver Monetização. |
| Agenda/operação centralizada | NÃO INICIADO | — |

## Backend

| Item | Estado | Observação |
| --- | --- | --- |
| Schema, RLS, triggers, RPCs (0001–0014) | PRONTO | Aplicadas e validadas no banco real em sessão anterior. |
| Migrations 0015–0020 | BLOQUEADO | Escritas e testadas localmente; aguardam aplicação no projeto real. |
| Matching determinístico | PARCIAL | Roda no servidor com service role; sem service role configurado, nenhum profissional é notificado. |
| Storage (avatars, portfolio, request-photos) | PARCIAL | Policies validadas localmente; upload real não testado. |

## Segurança

| Item | Estado | Observação |
| --- | --- | --- |
| RLS | PARCIAL | Brecha de contato antes do aceite corrigida em 0015 (pendente de aplicação). |
| Rate limiting | PARCIAL | Pronto no código (0016); depende de service role + migration. |
| Audit log | PARCIAL | 0017. |
| Open redirect no login | PRONTO | Corrigido. |
| Upload validado por conteúdo | PRONTO | — |
| Security Advisor após 0015–0020 | NÃO INICIADO | — |

## Monetização

| Item | Estado | Observação |
| --- | --- | --- |
| Tarifa fixa por oportunidade/conexão | NÃO INICIADO | Conceito preservado: valor fixo por conexão, **sem** percentual sobre o serviço. Arquitetura futura deve permitir valor padrão, valor por categoria, exceções e simulação, sem cobrança real. Nenhuma tabela criada ainda. |
| Cobrança / pagamento | NÃO INICIADO | Fora do MVP por decisão do plano mestre. |

## Beta

| Item | Estado | Observação |
| --- | --- | --- |
| Termos de Uso / Privacidade | PARCIAL | Rascunho para revisão jurídica; razão social, CNPJ e contato pendentes. |
| Aceite persistido | PARCIAL | 0018. |
| Analytics do funil | PARCIAL | 0019 + service role. |
| Identidade visual oficial (logo, favicon) | PRONTO | Ver `docs/brand-assets.md`. Paleta do app ainda mistura laranja (marca antiga) com o azul do logo. |
| Profissionais e clientes piloto | NÃO INICIADO | Comercial/operação. |

## PWA / app futuro

| Item | Estado | Observação |
| --- | --- | --- |
| Favicon e ícone Apple | PRONTO | `src/app/icon.png`, `src/app/apple-icon.png`. |
| Manifest / instalação PWA / offline | NÃO INICIADO | — |
| App nativo | NÃO INICIADO | Só após validar recorrência (plano mestre). |

## Conexões auditadas

| # | Conexão | Estado |
| --- | --- | --- |
| 1 | Supabase Auth | IMPLEMENTADO · NÃO TESTADO no projeto real |
| 2 | Criação real de pedido | IMPLEMENTADO · NÃO TESTADO no projeto real |
| 3 | Matching | PARCIAL (requer service role) |
| 4 | Aceite do profissional | IMPLEMENTADO · NÃO TESTADO no projeto real |
| 5 | Sugestão de horário | IMPLEMENTADO · NÃO TESTADO no projeto real |
| 6 | Confirmação do cliente | IMPLEMENTADO · NÃO TESTADO no projeto real |
| 7 | Appointment | IMPLEMENTADO · NÃO TESTADO no projeto real |
| 8 | Chat | PARCIAL (sem tempo real) |
| 9 | Storage / fotos | IMPLEMENTADO · NÃO TESTADO no projeto real |
| 10 | Conclusão do atendimento | IMPLEMENTADO · NÃO TESTADO no projeto real |
| 11 | Avaliação | IMPLEMENTADO · NÃO TESTADO no projeto real |
| 12 | Atualização de rating | IMPLEMENTADO (trigger) · NÃO TESTADO no projeto real |
| 13 | Notificações | NÃO IMPLEMENTADO (o sino do header é só visual) |
| 14 | Painel profissional | PARCIAL |
| 15 | Painel admin | PARCIAL |
| 16 | Tarifa fixa | NÃO IMPLEMENTADO |
| 17 | Analytics | PARCIAL (0019 não aplicada) |
| 18 | LGPD | PARCIAL (documentos em rascunho, sem fluxo de exclusão/exportação de dados) |
| 19 | Rate limiting | PARCIAL (0016 não aplicada) |
| 20 | Audit logs | PARCIAL (0017 não aplicada) |
| 21 | PWA | NÃO IMPLEMENTADO (só ícones) |
| 22 | Domínio / deploy | NÃO IMPLEMENTADO |

"Implementado · não testado no projeto real" significa: o fluxo passa no teste
local com Postgres + RLS reais (`src/test/mvpFlow.db.test.ts`), mas ainda não
foi exercitado contra o Supabase de produção.
