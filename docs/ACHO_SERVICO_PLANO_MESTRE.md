# ACHÔ SERVIÇO — PLANO MESTRE v0.1

**Slogan de trabalho:** Precisou? Achô.
**Data:** 16/09/2026

> Este arquivo é a fonte de verdade funcional inicial do produto. Ele deve ser lido antes de alterações relevantes no código.

## 1. Visão do produto e tese do negócio
O ACHÔ SERVIÇO será uma plataforma digital local para conectar pessoas que precisam resolver um serviço com profissionais independentes disponíveis para atender. O MVP organiza descoberta, pedido, disponibilidade, aceite, agenda, comunicação, reputação e histórico. Não processa o pagamento do serviço nesta fase.

### O que vende de verdade
- Cliente: acesso rápido a profissionais filtrados, agenda e reputação.
- Profissional: novos pedidos, presença digital, prova social e agenda organizada.
- Plataforma: monetização futura sobre a conexão gerada.

### Posicionamento
- Marca: ACHÔ SERVIÇO
- Linha: "Precisou? Achô."
- Categoria: marketplace local de serviços
- Foco MVP: encontrar + solicitar + aceitar + agendar + avaliar
- Fora do MVP: pagamento do serviço, split, carteira, app nativo e recursos sociais complexos

## 2. Problema e proposta de valor
### Cliente
- Não conhece prestadores confiáveis.
- Perde tempo pedindo indicação.
- Não sabe quem está realmente disponível.
- Tem pouca referência de qualidade e pontualidade.

### Profissional
- Depende de indicação.
- Tem períodos ociosos.
- Recebe pedidos desorganizados.
- Não tem portfólio, reputação e agenda em um lugar só.

## 3. Categorias iniciais
Prioridade: eletricista, encanador, refrigeração/ar-condicionado, pedreiro, pintor, serviços gerais/faz-tudo, montador de móveis, chaveiro, mecânico/socorro leve, técnico de eletrodomésticos, diarista/limpeza, jardinagem, manicure/pedicure, cabeleireiro/barbeiro a domicílio e costureira/ajustes.

Lançar mídia apenas para as categorias que tenham oferta real e agenda ativa.

## 4. Modelo operacional
### Regra central
Agenda viva = visibilidade. Profissional que mantém disponibilidade atualizada e responde bem ganha prioridade. Quem mantém agenda velha, ignora pedidos ou cancela demais perde posição e pode ser pausado.

### Estados do pedido
`draft -> open -> reviewing -> accepted -> scheduled -> in_service -> completed`
Saídas alternativas: `cancelled` e `expired`.

### Contato
Telefone/e-mail/WhatsApp não ficam expostos antes da confirmação. Após agendamento confirmado, liberar contato necessário.

## 5. Fluxo do cliente
1. Entrar e informar o que precisa.
2. Escolher categoria.
3. Definir região/bairro, data e faixa de horário.
4. Descrever problema e anexar fotos opcionalmente.
5. Visualizar profissionais disponíveis e reputação.
6. Enviar pedido aberto ou escolher alguém.
7. Receber aceite/recusa/proposta de horário.
8. Confirmar.
9. Acessar contato/chat completo.
10. Concluir e avaliar.

## 6. Fluxo do profissional
1. Conta e onboarding.
2. Categoria, especialidades e regiões.
3. Foto, portfólio e dados de verificação.
4. Agenda padrão + exceções.
5. Receber pedidos compatíveis.
6. Aceitar, recusar ou sugerir outro horário.
7. Acompanhar agenda.
8. Concluir serviço.
9. Receber avaliação.
10. Futuramente consumir crédito ou gerar taxa de conexão.

## 7. Confiança e segurança
- Avaliação somente após atendimento concluído.
- Nota acompanhada da quantidade de avaliações.
- Portfólio de serviços.
- Conta e identidade verificadas progressivamente.
- Denúncia, bloqueio, suspensão e logs administrativos.
- Moderação pode ocultar conteúdo ofensivo, fraudulento, spam ou dado pessoal.

## 8. Monetização
MVP: piloto gratuito controlado. Depois, preferir créditos pré-pagos ou taxa fixa por conexão confirmada. Evitar comissão percentual enquanto o pagamento do serviço ocorrer fora da plataforma.

## 9. Marketing
Ordem: oferta -> prova -> distribuição.

- Recrutamento manual de profissionais.
- Pedidos reais controlados com rede inicial.
- Geração das primeiras avaliações.
- Microinfluenciadores locais em onda coordenada.
- Tráfego pago por categoria/dor apenas quando houver oferta suficiente.
- CTA: resolver um serviço, não "baixar app".

## 10. Operação
Rotina diária: pedidos sem resposta, agenda desatualizada, cancelamentos, denúncias, conversão por categoria e acompanhamento dos profissionais novos.

## 11. Arquitetura técnica
- Next.js + TypeScript
- Tailwind CSS
- Supabase: Postgres, Auth, Storage e RLS
- Vercel
- Web app mobile-first; PWA quando fizer sentido

### Entidades mínimas
`profiles`, `professional_profiles`, `categories`, `professional_categories`, `availability_rules`, `availability_exceptions`, `service_requests`, `request_matches`, `appointments`, `portfolio_items`, `reviews`, `conversations`, `messages`, `reports`.

Preparar `credit_ledger` para fase futura, sem ativar cobrança no primeiro corte.

### Segurança
- RLS obrigatória.
- Sem secrets no Git.
- `.env.example`.
- Contato oculto pré-confirmação.
- Upload validado.
- Rate limiting.
- Logs de ações administrativas.

## 12. Métricas
Funil: visita -> busca -> pedido iniciado -> pedido enviado -> resposta -> conexão confirmada -> concluído -> avaliação -> recorrência.

Oferta: profissionais ativos, agenda atualizada, tempo de resposta, taxa de aceite e cancelamento.

## 13. Jurídico e privacidade
Checklist, não parecer jurídico: Termos de Uso, termos para profissionais, Política de Privacidade LGPD, moderação, cancelamento, retenção/exclusão de dados e revisão do modelo tributário/contábil antes da monetização pública.

## 14. Riscos
- Oferta insuficiente.
- Profissional não responde.
- Negociação por fora.
- Qualidade inconsistente.
- Fraude/identidade.
- CAC alto.
- Produto complexo cedo demais.
- Categorias demais.
- Risco jurídico.

## 15. Roadmap 90 dias
### Dias 1-21
MVP web, recrutamento e base de marca.
### Dias 22-45
Beta controlado, chat, painel admin, correção dos gargalos.
### Dias 46-70
Portfólio, moderação, analytics e marketing por categoria.
### Dias 71-90
Teste de monetização e escala apenas do que tiver conversão e recorrência.

## 16. Próximas 3 semanas
### Semana 1
Repo, base técnica, categorias, prospecção e landing.
### Semana 2
Fluxo completo, agenda, portfólio, avaliações e teste com conhecidos.
### Semana 3
Beta local, conteúdo, influenciadores e tráfego pequeno por categoria.

## 17. Critério de validação
O MVP é validado quando o ciclo pedido -> resposta -> agendamento -> conclusão -> avaliação se repete com tempo de resposta aceitável e começa a gerar recorrência. Cadastro por si só não valida o produto.

## 18. App nativo no futuro
Só avaliar iOS/Android depois de validar recorrência e necessidade real de recursos nativos. Publicação exige contas de desenvolvedor, políticas, materiais de loja e manutenção. Conferir exigências e valores diretamente nas lojas na época da publicação.

## 19. Gate de escala
Não abrir nova cidade enquanto a cidade piloto ainda depender de intervenção manual constante em cada pedido. Primeiro estabilizar oferta, resposta, conclusão e recorrência.

---

## Anexo — Decisões de implementação técnica (MVP)

O plano acima define produto e negócio, mas não especifica schema/enum a nível de
banco. As decisões abaixo resolvem essas lacunas para o MVP, sem contrariar nenhuma
regra do plano:

- **`service_requests.status`** usa o enum exato do plano:
  `draft, open, reviewing, accepted, scheduled, in_service, completed, cancelled, expired`.
  - `draft`: pedido ainda sendo preenchido pelo cliente (rascunho, não visível a
    profissionais).
  - `open`: pedido enviado; `request_matches` foram criados para profissionais
    elegíveis, aguardando resposta.
  - `reviewing`: pelo menos um profissional respondeu (aceitou ou propôs horário) e o
    cliente está avaliando as respostas.
  - `accepted`: cliente confirmou um profissional/horário específico.
  - `scheduled`: `appointment` criado a partir da confirmação; contato liberado.
  - `in_service`: dia/horário do atendimento em curso (marcação opcional/manual).
  - `completed`: atendimento concluído, liberado para avaliação.
  - `cancelled` / `expired`: saídas alternativas (cancelado por qualquer parte, ou
    expirado por falta de resposta dentro do prazo).
- **`request_matches.status`**: `pending, accepted, declined, proposed_new_time,
  expired` — resposta individual de cada profissional notificado sobre um pedido.
  Uma proposta de novo horário fica nos próprios campos de `request_matches`
  (`proposed_date`, `proposed_time_window_start/end`), sem tabela extra de
  contraproposta.
- **`appointments.status`**: `scheduled, in_service, completed, cancelled, no_show`.
- **Regiões atendidas pelo profissional**: coluna `service_areas text[]` em
  `professional_profiles` (bairros/regiões), em vez de uma tabela separada — o plano
  não lista uma entidade própria para isso e o array é suficiente para o matching por
  região no MVP.
- **Logs de ações administrativas**: tabela `admin_action_logs` (não listada
  explicitamente nas "entidades mínimas", mas exigida na seção de Segurança) —
  registra admin, ação, alvo e timestamp.
- **Rate limiting**: infraestrutura completa de rate limiting (edge/gateway) fica fora
  do primeiro corte por custo/complexidade. O MVP aplica um limite simples em nível de
  aplicação: cooldown mínimo entre pedidos consecutivos do mesmo cliente, validado no
  servidor ao criar `service_requests`. Rate limiting de infraestrutura é pendência
  registrada para a próxima fase.
- **Upload validado**: validação de tipo MIME e tamanho máximo no cliente e checada
  novamente no bucket do Supabase Storage (policies por tipo/tamanho), para fotos de
  pedido, portfólio e avatar.
- **`credit_ledger`**: apenas mencionada como preparação de arquitetura futura; nenhuma
  tabela, rota ou UI é criada para ela agora.
- **Categorias iniciais**: as 15 categorias da seção 3 são inseridas via seed de
  migration, exatamente como listadas — nenhuma categoria adicional de demonstração é
  criada.
