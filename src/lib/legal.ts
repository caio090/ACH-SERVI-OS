/**
 * Termos de Uso e Política de Privacidade — VERSÃO PARA REVISÃO JURÍDICA.
 * Estrutura inicial clara para o beta controlado; não é parecer jurídico e
 * precisa ser revisada por advogado antes do lançamento público. Dados que o
 * projeto ainda não definiu (razão social, CNPJ, canal oficial de contato)
 * aparecem como pendência explícita, nunca inventados.
 *
 * Ao mudar o conteúdo de forma relevante, troque LEGAL_VERSION: o aceite
 * gravado no perfil (profiles.terms_version) referencia essa versão.
 */

export const LEGAL_VERSION = "2026-10-20-beta";
export const LEGAL_REVIEW_NOTICE = "Versão para revisão jurídica antes do lançamento público.";

export function legalContactLabel() {
  return process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL || "canal oficial de contato a ser publicado antes do lançamento público";
}

export type LegalSection = { id: string; title: string; paragraphs: string[] };
export type LegalDocument = { title: string; updatedAt: string; sections: LegalSection[] };

const CONTROLLER_PENDING = "[pendente: razão social e CNPJ do responsável pela plataforma]";

export function getTermsOfUse(): LegalDocument {
  return {
    title: "Termos de Uso",
    updatedAt: "20/10/2026",
    sections: [
      {
        id: "natureza",
        title: "1. O que é o ACHÔ SERVIÇO",
        paragraphs: [
          `O ACHÔ SERVIÇO é uma plataforma digital que conecta pessoas que precisam de um serviço (clientes) a profissionais independentes (profissionais). A plataforma é operada por ${CONTROLLER_PENDING}.`,
          "A plataforma organiza pedido, disponibilidade, aceite, agenda, comunicação, avaliação e histórico. Nesta fase (beta controlado), o ACHÔ SERVIÇO não processa o pagamento do serviço: valores e forma de pagamento são combinados diretamente entre cliente e profissional.",
        ],
      },
      {
        id: "partes",
        title: "2. Cliente e profissional",
        paragraphs: [
          "O profissional é independente: não é empregado, sócio nem representante do ACHÔ SERVIÇO. Ele decide quais pedidos aceita, seus horários e as condições do serviço.",
          "O cliente se compromete a descrever o pedido com veracidade, informar endereço correto e estar disponível no horário confirmado.",
        ],
      },
      {
        id: "responsabilidade",
        title: "3. Responsabilidade pelo serviço",
        paragraphs: [
          "A execução, a qualidade, a segurança, o preço e a garantia do serviço são de responsabilidade do profissional que o realiza, nos termos da lei. O ACHÔ SERVIÇO atua como intermediador da conexão e não executa os serviços.",
          "O ACHÔ SERVIÇO adota medidas para dar confiança (avaliações após atendimento concluído, verificação progressiva de profissionais, denúncia e suspensão), mas não garante o resultado de cada serviço.",
        ],
      },
      {
        id: "conduta",
        title: "4. Conduta esperada",
        paragraphs: [
          "É proibido: usar dados falsos ou de terceiros; publicar conteúdo ofensivo, discriminatório, fraudulento ou spam; assediar outros usuários; usar a plataforma para atividades ilegais; tentar burlar as regras de contato, segurança ou limites de uso.",
        ],
      },
      {
        id: "suspensao",
        title: "5. Moderação e suspensão",
        paragraphs: [
          "Podemos ocultar conteúdo, pausar perfis, suspender ou encerrar contas que violem estes Termos, recebam denúncias procedentes ou coloquem outros usuários em risco. Ações administrativas ficam registradas internamente.",
          "Profissionais que mantêm a agenda desatualizada, ignoram pedidos ou cancelam com frequência podem perder prioridade ou ser pausados.",
        ],
      },
      {
        id: "avaliacoes",
        title: "6. Avaliações",
        paragraphs: [
          "Somente o cliente de um atendimento concluído pode avaliar o profissional, uma vez por atendimento. A nota é exibida com a quantidade de avaliações.",
          "Avaliações devem refletir a experiência real. Podemos remover avaliações ofensivas, fraudulentas ou com dados pessoais.",
        ],
      },
      {
        id: "comunicacao",
        title: "7. Comunicação e contato",
        paragraphs: [
          "Telefone e e-mail das partes ficam ocultos até a confirmação do agendamento. Depois da confirmação, os dados de contato necessários são liberados para cliente e profissional envolvidos.",
          "As mensagens trocadas pela plataforma podem ser analisadas pela moderação em caso de denúncia.",
        ],
      },
      {
        id: "limitacoes",
        title: "8. Limitações",
        paragraphs: [
          "A plataforma está em beta controlado e pode ter instabilidades, mudanças de funcionalidade ou interrupções. Não nos responsabilizamos por acordos feitos fora da plataforma.",
        ],
      },
      {
        id: "alteracoes",
        title: "9. Alterações destes Termos",
        paragraphs: [
          "Estes Termos podem ser atualizados. Mudanças relevantes serão comunicadas na plataforma e, quando necessário, pediremos um novo aceite.",
          `Dúvidas: ${legalContactLabel()}.`,
        ],
      },
    ],
  };
}

export function getPrivacyPolicy(): LegalDocument {
  return {
    title: "Política de Privacidade",
    updatedAt: "20/10/2026",
    sections: [
      {
        id: "controlador",
        title: "1. Quem trata seus dados",
        paragraphs: [
          `O controlador dos dados pessoais tratados no ACHÔ SERVIÇO é ${CONTROLLER_PENDING}. Esta política segue a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).`,
        ],
      },
      {
        id: "dados",
        title: "2. Dados que coletamos",
        paragraphs: [
          "Cadastro: nome, e-mail e senha (a senha é guardada de forma criptografada pelo provedor de autenticação; não temos acesso a ela). Opcionalmente: telefone, cidade, bairro e foto.",
          "Profissionais: descrição, categorias, bairros atendidos, agenda, portfólio e indicadores de reputação (nota, quantidade de avaliações e taxa de resposta).",
          "Pedidos: categoria, descrição do problema, bairro, cidade, data e faixa de horário, fotos opcionais e, após a confirmação, o endereço do atendimento.",
          "Uso: eventos de navegação agregados (por exemplo, visita à página inicial ou início de pedido) associados a um identificador aleatório do navegador ou à conta, sem conteúdo de mensagens.",
          "Segurança: registros técnicos para limitar abuso (o IP é guardado apenas em forma pseudonimizada e por pouco tempo) e registros de ações administrativas.",
        ],
      },
      {
        id: "finalidade",
        title: "3. Para que usamos",
        paragraphs: [
          "Para criar e manter sua conta, conectar pedidos a profissionais compatíveis, permitir agenda, conversa e avaliação, prevenir fraude e abuso, cumprir obrigações legais e medir o funcionamento do serviço de forma agregada.",
          "Bases legais: execução do contrato (uso da plataforma), legítimo interesse (segurança, prevenção a fraude e melhoria do serviço) e cumprimento de obrigação legal.",
        ],
      },
      {
        id: "autenticacao",
        title: "4. Autenticação",
        paragraphs: [
          "O login é feito por e-mail e senha por meio do provedor de autenticação da plataforma (Supabase). Cookies de sessão são usados apenas para manter você conectado.",
        ],
      },
      {
        id: "localizacao",
        title: "5. Localização e endereço",
        paragraphs: [
          "Não coletamos localização em tempo real (GPS). Usamos bairro e cidade informados por você para encontrar profissionais da região. O endereço completo do atendimento só é informado no momento da confirmação e fica visível apenas para o profissional confirmado.",
        ],
      },
      {
        id: "mensagens",
        title: "6. Mensagens",
        paragraphs: [
          "As conversas são visíveis apenas para cliente e profissional do pedido. A moderação pode acessá-las para apurar denúncias.",
        ],
      },
      {
        id: "fotos",
        title: "7. Fotos",
        paragraphs: [
          "Fotos de pedidos ficam em armazenamento privado, visíveis apenas ao cliente e aos profissionais notificados sobre o pedido. Fotos de portfólio e de perfil são públicas. Antes do envio, as fotos são reduzidas e os metadados do arquivo (como localização GPS da câmera) são descartados.",
        ],
      },
      {
        id: "compartilhamento",
        title: "8. Compartilhamento",
        paragraphs: [
          "Compartilhamos dados apenas quando necessário: entre cliente e profissional de um atendimento confirmado (nome e contato); com provedores de infraestrutura que operam a plataforma (hospedagem e banco de dados); e com autoridades, quando exigido por lei. Não vendemos dados pessoais.",
        ],
      },
      {
        id: "retencao",
        title: "9. Por quanto tempo guardamos",
        paragraphs: [
          "Mantemos os dados enquanto a conta estiver ativa e pelo tempo necessário para cumprir obrigações legais, resolver disputas e prevenir fraude. Registros técnicos de limite de uso são apagados em poucos dias. Os prazos definitivos de retenção serão fixados na revisão jurídica antes do lançamento público.",
        ],
      },
      {
        id: "direitos",
        title: "10. Seus direitos",
        paragraphs: [
          "Você pode pedir confirmação do tratamento, acesso, correção, anonimização, portabilidade, eliminação dos dados tratados com base no consentimento, informação sobre compartilhamento e revisão de decisões automatizadas, nos termos do art. 18 da LGPD.",
          `Para exercer seus direitos: ${legalContactLabel()}.`,
        ],
      },
      {
        id: "cookies",
        title: "11. Cookies e tecnologias semelhantes",
        paragraphs: [
          "Usamos cookies essenciais de sessão (login) e armazenamento local do navegador para guardar o rascunho do pedido e um identificador aleatório usado nas métricas agregadas de uso. Não usamos cookies de publicidade nem ferramentas de rastreamento de terceiros.",
        ],
      },
      {
        id: "contato",
        title: "12. Contato e alterações",
        paragraphs: [
          `Encarregado (DPO) e contato: ${legalContactLabel()}. Esta política pode ser atualizada; mudanças relevantes serão comunicadas na plataforma.`,
        ],
      },
    ],
  };
}
