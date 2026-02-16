export const overviewMock = {
  kpis: {
    messages: {
      value: 2847,
      deltaLabel: "+12.5% vs. período anterior",
      deltaDirection: "up" as const,
      sparkline: [320, 410, 380, 460, 430, 490, 520],
    },
    conversations: {
      value: 156,
      deltaLabel: "+8.3% vs. anterior",
      deltaDirection: "up" as const,
      sparkline: [18, 22, 20, 24, 21, 26, 25],
    },
    replyRate: {
      value: 87,
      deltaLabel: "-2.1% vs. anterior",
      deltaDirection: "down" as const,
      sparkline: [92, 90, 88, 86, 87, 86, 87],
    },
    conversions: {
      value: 43,
      deltaLabel: "+15.2% vs. anterior",
      deltaDirection: "up" as const,
      sparkline: [4, 6, 5, 7, 6, 8, 7],
    },
  },
  top: {
    automations: [
      { rankLabel: "🥇", name: "Boas-vindas Clientes", count: 234 },
      { rankLabel: "🥈", name: "Agendamento", count: 189 },
      { rankLabel: "🥉", name: "Carrinho Abandonado", count: 156 },
      { rankLabel: "", name: "Confirmação", count: 123 },
      { rankLabel: "", name: "Pesquisa NPS", count: 98 },
    ],
    contacts: [
      { rank: 1, name: "João Silva", messages: 47 },
      { rank: 2, name: "Maria Oliveira", messages: 38 },
      { rank: 3, name: "Carlos Santos", messages: 32 },
      { rank: 4, name: "Ana Costa", messages: 28 },
      { rank: 5, name: "Pedro Almeida", messages: 24 },
    ],
    agents: [
      { rank: 1, name: "Maria Santos", conversations: 156, avgResponse: "1m 52s" },
      { rank: 2, name: "Carlos Oliveira", conversations: 134, avgResponse: "2m 11s" },
      { rank: 3, name: "João Silva", conversations: 98, avgResponse: "2m 34s" },
      { rank: 4, name: "Ana Lima", conversations: 87, avgResponse: "2m 58s" },
    ],
  },
} as const;

export type AutomationRow = {
  id: string;
  name: string;
  status: "active" | "paused";
  shots: number;
  completionRatePct: number;
  avgCompletion: string;
  conversions: number;
  errorRatePct: number;
};

export type AutomationFunnelStep = {
  label: string;
  value: number;
};

export const automationsMock: { rows: AutomationRow[]; funnelById: Record<string, AutomationFunnelStep[]> } = {
  rows: [
    {
      id: "a1",
      name: "Boas-vindas",
      status: "active",
      shots: 234,
      completionRatePct: 89,
      avgCompletion: "3min 20s",
      conversions: 12,
      errorRatePct: 1.2,
    },
    {
      id: "a2",
      name: "Agendamento",
      status: "active",
      shots: 189,
      completionRatePct: 76,
      avgCompletion: "5min 10s",
      conversions: 45,
      errorRatePct: 2.8,
    },
    {
      id: "a3",
      name: "Carrinho Abandonado",
      status: "active",
      shots: 156,
      completionRatePct: 45,
      avgCompletion: "8min 30s",
      conversions: 23,
      errorRatePct: 3.1,
    },
    {
      id: "a4",
      name: "Confirmação",
      status: "paused",
      shots: 123,
      completionRatePct: 81,
      avgCompletion: "2min 50s",
      conversions: 18,
      errorRatePct: 1.9,
    },
    {
      id: "a5",
      name: "Pesquisa NPS",
      status: "active",
      shots: 98,
      completionRatePct: 62,
      avgCompletion: "4min 05s",
      conversions: 0,
      errorRatePct: 0.7,
    },
    {
      id: "a6",
      name: "Reativação",
      status: "paused",
      shots: 74,
      completionRatePct: 38,
      avgCompletion: "9min 15s",
      conversions: 6,
      errorRatePct: 4.4,
    },
    {
      id: "a7",
      name: "Pós-venda",
      status: "active",
      shots: 112,
      completionRatePct: 71,
      avgCompletion: "6min 22s",
      conversions: 9,
      errorRatePct: 2.2,
    },
    {
      id: "a8",
      name: "Cobrança",
      status: "active",
      shots: 88,
      completionRatePct: 57,
      avgCompletion: "7min 40s",
      conversions: 14,
      errorRatePct: 3.6,
    },
    {
      id: "a9",
      name: "Qualificação Lead",
      status: "active",
      shots: 141,
      completionRatePct: 66,
      avgCompletion: "3min 58s",
      conversions: 21,
      errorRatePct: 2.5,
    },
    {
      id: "a10",
      name: "Lembrete Consulta",
      status: "paused",
      shots: 62,
      completionRatePct: 84,
      avgCompletion: "1min 55s",
      conversions: 7,
      errorRatePct: 1.1,
    },
  ],
  funnelById: {
    a1: [
      { label: "Disparador", value: 234 },
      { label: "Mensagem 1", value: 228 },
      { label: "Pergunta", value: 210 },
      { label: "Condição", value: 195 },
      { label: "Mensagem Final", value: 183 },
    ],
    a2: [
      { label: "Disparador", value: 189 },
      { label: "Mensagem 1", value: 176 },
      { label: "Escolha Horário", value: 140 },
      { label: "Confirmação", value: 112 },
      { label: "Final", value: 98 },
    ],
  },
} as const;

export const conversationsMock = {
  kpis: {
    total: 156,
    resolved: 143,
    resolvedPct: 92,
    avgHandleTime: "8min 45s",
    transferRatePct: 5,
  },
  volume: [
    { data: "20/01", novas: 22, resolvidas: 19, abertas: 6 },
    { data: "21/01", novas: 26, resolvidas: 23, abertas: 7 },
    { data: "22/01", novas: 19, resolvidas: 18, abertas: 5 },
    { data: "23/01", novas: 28, resolvidas: 24, abertas: 8 },
    { data: "24/01", novas: 25, resolvidas: 22, abertas: 7 },
    { data: "25/01", novas: 20, resolvidas: 19, abertas: 6 },
    { data: "26/01", novas: 16, resolvidas: 18, abertas: 5 },
  ],
  statusBreakdown: [
    { name: "Resolvidas", value: 143 },
    { name: "Abertas", value: 8 },
    { name: "Aguardando Cliente", value: 3 },
    { name: "Arquivadas", value: 2 },
  ],
  origins: [
    { name: "Bot - Boas-vindas", pct: 45 },
    { name: "Bot - Palavra-chave", pct: 28 },
    { name: "Mensagem Direta", pct: 18 },
    { name: "Campanha", pct: 7 },
    { name: "Outro", pct: 2 },
  ],
} as const;

export type TemplateRow = {
  id: string;
  name: string;
  category: "Utilidade" | "Marketing" | "Suporte";
  status: "Aprovado" | "Pendente" | "Rejeitado";
  sent: number;
  deliveryRatePct: number;
  readRatePct: number;
  buttonClicks: number | null;
  conversions: number | null;
};

export const templatesMock: { rows: TemplateRow[] } = {
  rows: [
    {
      id: "t1",
      name: "confirmacao_agendamento",
      category: "Utilidade",
      status: "Aprovado",
      sent: 234,
      deliveryRatePct: 98,
      readRatePct: 87,
      buttonClicks: null,
      conversions: 198,
    },
    {
      id: "t2",
      name: "carrinho_abandonado",
      category: "Marketing",
      status: "Aprovado",
      sent: 156,
      deliveryRatePct: 97,
      readRatePct: 65,
      buttonClicks: 89,
      conversions: 23,
    },
    {
      id: "t3",
      name: "rastreamento_pedido",
      category: "Utilidade",
      status: "Aprovado",
      sent: 189,
      deliveryRatePct: 99,
      readRatePct: 92,
      buttonClicks: null,
      conversions: null,
    },
    {
      id: "t4",
      name: "confirmacao_pagamento",
      category: "Utilidade",
      status: "Aprovado",
      sent: 142,
      deliveryRatePct: 98,
      readRatePct: 84,
      buttonClicks: null,
      conversions: 61,
    },
    {
      id: "t5",
      name: "retorno_suporte",
      category: "Suporte",
      status: "Pendente",
      sent: 22,
      deliveryRatePct: 0,
      readRatePct: 0,
      buttonClicks: null,
      conversions: null,
    },
    {
      id: "t6",
      name: "promocao_fim_de_semana",
      category: "Marketing",
      status: "Rejeitado",
      sent: 0,
      deliveryRatePct: 0,
      readRatePct: 0,
      buttonClicks: null,
      conversions: null,
    },
    {
      id: "t7",
      name: "followup_orcamento",
      category: "Suporte",
      status: "Aprovado",
      sent: 98,
      deliveryRatePct: 96,
      readRatePct: 71,
      buttonClicks: 24,
      conversions: 11,
    },
    {
      id: "t8",
      name: "boas_vindas",
      category: "Utilidade",
      status: "Aprovado",
      sent: 312,
      deliveryRatePct: 99,
      readRatePct: 90,
      buttonClicks: null,
      conversions: null,
    },
    {
      id: "t9",
      name: "pesquisa_nps",
      category: "Utilidade",
      status: "Aprovado",
      sent: 104,
      deliveryRatePct: 97,
      readRatePct: 52,
      buttonClicks: 31,
      conversions: 0,
    },
    {
      id: "t10",
      name: "cupom_primeira_compra",
      category: "Marketing",
      status: "Aprovado",
      sent: 76,
      deliveryRatePct: 95,
      readRatePct: 58,
      buttonClicks: 19,
      conversions: 6,
    },
  ],
} as const;

export type TeamRow = {
  id: string;
  initials: string;
  name: string;
  online: boolean;
  conversations: number;
  avgResponse: string;
  resolutionRatePct: number;
  nps: number;
  sentMessages: number;
  dist: { resolved: number; open: number; transferred: number };
};

export const teamMock: { rows: TeamRow[] } = {
  rows: [
    {
      id: "u1",
      initials: "MS",
      name: "Maria Santos",
      online: true,
      conversations: 156,
      avgResponse: "2min 12s",
      resolutionRatePct: 95,
      nps: 4.8,
      sentMessages: 1234,
      dist: { resolved: 120, open: 28, transferred: 8 },
    },
    {
      id: "u2",
      initials: "CO",
      name: "Carlos Oliveira",
      online: true,
      conversations: 134,
      avgResponse: "3min 45s",
      resolutionRatePct: 91,
      nps: 4.6,
      sentMessages: 987,
      dist: { resolved: 96, open: 30, transferred: 8 },
    },
    {
      id: "u3",
      initials: "JS",
      name: "João Silva",
      online: false,
      conversations: 98,
      avgResponse: "4min 20s",
      resolutionRatePct: 88,
      nps: 4.5,
      sentMessages: 756,
      dist: { resolved: 74, open: 18, transferred: 6 },
    },
    {
      id: "u4",
      initials: "AL",
      name: "Ana Lima",
      online: true,
      conversations: 87,
      avgResponse: "2min 50s",
      resolutionRatePct: 93,
      nps: 4.7,
      sentMessages: 689,
      dist: { resolved: 66, open: 16, transferred: 5 },
    },
  ],
} as const;

export const whatsappMock = {
  health: {
    uptimePct: 99.2,
    avgLatencyMs: 45,
    queue: 0,
  },
  uptime24h: [
    { start: "00:00", end: "10:15", status: "online" as const },
    { start: "10:15", end: "10:18", status: "reconnecting" as const },
    { start: "10:18", end: "18:43", status: "online" as const },
    { start: "18:43", end: "18:45", status: "offline" as const },
    { start: "18:45", end: "19:05", status: "reconnecting" as const },
    { start: "19:05", end: "24:00", status: "online" as const },
  ],
  events: [
    { ts: "27/01 14:32", event: "Conectado", status: "ok" as const },
    { ts: "27/01 10:15", event: "Sincronização", status: "ok" as const },
    { ts: "26/01 18:45", event: "Reconectado", status: "warn" as const },
    { ts: "26/01 18:43", event: "Desconectado", status: "error" as const },
  ],
} as const;
