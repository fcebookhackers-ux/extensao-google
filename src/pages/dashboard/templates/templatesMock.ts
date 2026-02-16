export type TemplateStatus = "approved" | "pending" | "rejected";
export type TemplateCategory = "marketing" | "utility" | "authentication";
export type TemplateLanguage = "pt_BR" | "es" | "en";

export type TemplateHeader =
  | { type: "none" }
  | { type: "text"; text: string }
  | { type: "image"; fileName?: string }
  | { type: "video"; fileName?: string }
  | { type: "document"; fileName?: string };

export type TemplateButton =
  | { id: string; kind: "quick_reply"; text: string }
  | {
      id: string;
      kind: "cta_url";
      text: string;
      urlType: "static" | "dynamic";
      url?: string;
    }
  | {
      id: string;
      kind: "cta_phone";
      text: string;
      phoneNumber?: string;
    };

export type MessageTemplate = {
  id: string;
  name: string;
  description: string;
  status: TemplateStatus;
  category: TemplateCategory;
  language: TemplateLanguage;
  createdAt: string;
  updatedAt: string;
  content: {
    header: TemplateHeader;
    body: string;
    footer?: string;
    buttons?: TemplateButton[];
  };
  stats?: {
    usedInAutomations: number;
    sentLast30d: number;
    deliveryRatePct: number;
  };
  meta?: {
    pendingSinceHours?: number;
    rejectionReason?: string;
  };
};

function isoHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export const templatesMock: MessageTemplate[] = [
  {
    id: "t_approved_1",
    status: "approved",
    category: "utility",
    name: "confirmacao_agendamento",
    description: "Confirmação automática de consulta agendada",
    language: "pt_BR",
    createdAt: isoHoursAgo(240),
    updatedAt: isoHoursAgo(10),
    content: {
      header: { type: "image" },
      body:
        "Olá {{1}}, confirmamos seu agendamento para {{2}} às {{3}}. Confirme respondendo SIM ou reagende clicando no link.",
      footer: "Não responda esta mensagem",
      buttons: [
        { id: "b1", kind: "quick_reply", text: "Confirmar" },
        { id: "b2", kind: "quick_reply", text: "Reagendar" },
      ],
    },
    stats: { usedInAutomations: 3, sentLast30d: 234, deliveryRatePct: 98 },
  },
  {
    id: "t_pending_1",
    status: "pending",
    category: "marketing",
    name: "oferta_especial_verao",
    description: "Oferta sazonal para clientes com opt-in",
    language: "pt_BR",
    createdAt: isoHoursAgo(18),
    updatedAt: isoHoursAgo(18),
    content: {
      header: { type: "none" },
      body: "Olá {{1}}! Temos uma oferta especial de verão: {{2}}. Quer receber o cupom?",
    },
    meta: { pendingSinceHours: 18 },
  },
  {
    id: "t_rejected_1",
    status: "rejected",
    category: "marketing",
    name: "promocao_teste",
    description: "Teste de promoção",
    language: "pt_BR",
    createdAt: isoHoursAgo(72),
    updatedAt: isoHoursAgo(60),
    content: {
      header: { type: "none" },
      body: "🔥 Promoção imperdível! Compre agora e ganhe {{1}}% OFF. Clique: {{2}}",
    },
    meta: {
      rejectionReason: "Conteúdo promocional sem opt-in prévio do usuário. Veja diretrizes.",
    },
  },

  // Aprovados (mais 9)
  {
    id: "t_approved_2",
    status: "approved",
    category: "utility",
    name: "boas_vindas_cliente",
    description: "Mensagem de boas-vindas após cadastro",
    language: "pt_BR",
    createdAt: isoHoursAgo(300),
    updatedAt: isoHoursAgo(24),
    content: {
      header: { type: "text", text: "Bem-vindo!" },
      body: "Olá {{1}}, é um prazer ter você com a gente. Posso te ajudar com algo agora?",
    },
    stats: { usedInAutomations: 5, sentLast30d: 812, deliveryRatePct: 99 },
  },
  {
    id: "t_approved_3",
    status: "approved",
    category: "utility",
    name: "rastreamento_pedido",
    description: "Atualização de status e rastreio",
    language: "pt_BR",
    createdAt: isoHoursAgo(400),
    updatedAt: isoHoursAgo(35),
    content: {
      header: { type: "none" },
      body: "Olá {{1}}, seu pedido {{2}} foi enviado! Código de rastreamento: {{3}}.",
    },
    stats: { usedInAutomations: 4, sentLast30d: 1020, deliveryRatePct: 98 },
  },
  {
    id: "t_approved_4",
    status: "approved",
    category: "authentication",
    name: "codigo_verificacao",
    description: "OTP para autenticação",
    language: "pt_BR",
    createdAt: isoHoursAgo(500),
    updatedAt: isoHoursAgo(110),
    content: {
      header: { type: "none" },
      body: "Seu código de verificação é {{1}}. Ele expira em {{2}} minutos.",
      footer: "Se você não solicitou, ignore.",
    },
    stats: { usedInAutomations: 2, sentLast30d: 540, deliveryRatePct: 99 },
  },
  {
    id: "t_approved_5",
    status: "approved",
    category: "utility",
    name: "lembrete_pagamento",
    description: "Lembrete amigável de vencimento",
    language: "pt_BR",
    createdAt: isoHoursAgo(220),
    updatedAt: isoHoursAgo(90),
    content: {
      header: { type: "none" },
      body: "Oi {{1}}! Lembrete: seu pagamento de {{2}} vence em {{3}}. Precisa de ajuda?",
    },
    stats: { usedInAutomations: 2, sentLast30d: 180, deliveryRatePct: 97 },
  },
  {
    id: "t_approved_6",
    status: "approved",
    category: "utility",
    name: "pesquisa_satisfacao",
    description: "NPS rápido após atendimento",
    language: "pt_BR",
    createdAt: isoHoursAgo(340),
    updatedAt: isoHoursAgo(120),
    content: {
      header: { type: "none" },
      body: "{{1}}, como foi sua experiência hoje? Responda com uma nota de 0 a 10.",
    },
    stats: { usedInAutomations: 3, sentLast30d: 320, deliveryRatePct: 96 },
  },
  {
    id: "t_approved_7",
    status: "approved",
    category: "marketing",
    name: "carrinho_abandonado",
    description: "Recuperação de carrinho com opt-in",
    language: "pt_BR",
    createdAt: isoHoursAgo(260),
    updatedAt: isoHoursAgo(80),
    content: {
      header: { type: "image" },
      body: "{{1}}, seu carrinho ainda está te esperando 🙂 Quer finalizar sua compra de {{2}}?",
      buttons: [{ id: "b1", kind: "cta_url", text: "Finalizar", urlType: "static", url: "https://exemplo.com" }],
    },
    stats: { usedInAutomations: 1, sentLast30d: 95, deliveryRatePct: 94 },
  },
  {
    id: "t_approved_8",
    status: "approved",
    category: "utility",
    name: "nova_mensagem",
    description: "Aviso de nova atualização",
    language: "pt_BR",
    createdAt: isoHoursAgo(180),
    updatedAt: isoHoursAgo(12),
    content: {
      header: { type: "none" },
      body: "Olá {{1}}, temos uma nova atualização no seu atendimento: {{2}}.",
    },
    stats: { usedInAutomations: 1, sentLast30d: 60, deliveryRatePct: 98 },
  },
  {
    id: "t_approved_9",
    status: "approved",
    category: "utility",
    name: "confirmacao_pagamento",
    description: "Confirmação de pagamento",
    language: "pt_BR",
    createdAt: isoHoursAgo(310),
    updatedAt: isoHoursAgo(70),
    content: {
      header: { type: "none" },
      body: "Recebemos seu pagamento, {{1}}. Valor: {{2}}. Obrigado!",
    },
    stats: { usedInAutomations: 2, sentLast30d: 210, deliveryRatePct: 99 },
  },
  {
    id: "t_approved_10",
    status: "approved",
    category: "utility",
    name: "lembrete_agendamento",
    description: "Lembrete antes da consulta",
    language: "pt_BR",
    createdAt: isoHoursAgo(360),
    updatedAt: isoHoursAgo(15),
    content: {
      header: { type: "none" },
      body: "Olá {{1}}! Lembrete: seu agendamento é amanhã ({{2}}) às {{3}}.",
    },
    stats: { usedInAutomations: 2, sentLast30d: 190, deliveryRatePct: 97 },
  },

  // Pendentes (mais 2)
  {
    id: "t_pending_2",
    status: "pending",
    category: "utility",
    name: "confirmar_endereco",
    description: "Solicita confirmação de endereço",
    language: "pt_BR",
    createdAt: isoHoursAgo(30),
    updatedAt: isoHoursAgo(30),
    content: {
      header: { type: "none" },
      body: "{{1}}, você confirma este endereço para entrega? {{2}}",
      buttons: [
        { id: "b1", kind: "quick_reply", text: "Confirmo" },
        { id: "b2", kind: "quick_reply", text: "Alterar" },
      ],
    },
    meta: { pendingSinceHours: 30 },
  },
  {
    id: "t_pending_3",
    status: "pending",
    category: "authentication",
    name: "otp_login",
    description: "OTP para login rápido",
    language: "en",
    createdAt: isoHoursAgo(6),
    updatedAt: isoHoursAgo(6),
    content: {
      header: { type: "none" },
      body: "Your verification code is {{1}}. It expires in {{2}} minutes.",
    },
    meta: { pendingSinceHours: 6 },
  },

  // Rejeitados (mais 1)
  {
    id: "t_rejected_2",
    status: "rejected",
    category: "marketing",
    name: "cupom_sem_optin",
    description: "Cupom enviado sem contexto",
    language: "pt_BR",
    createdAt: isoHoursAgo(96),
    updatedAt: isoHoursAgo(80),
    content: {
      header: { type: "none" },
      body: "Cupom {{1}} válido até {{2}}! Aproveite já.",
    },
    meta: { rejectionReason: "Mensagem de marketing sem opt-in e sem opção de opt-out." },
  },
];
