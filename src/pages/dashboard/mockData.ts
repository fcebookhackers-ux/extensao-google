export type DashboardKpis = {
  sentToday: number;
  sentVsYesterdayPct: number;
  sentSparkline7d: number[];
  activeConversations: number;
  unreadConversations: number;
  responseRatePct: number;
  avgResponseTime: string;
  newContacts7d: number;
  newContactsToday: number;
};

export type MessagesChartPoint = {
  day: string;
  sent: number;
  received: number;
};

export type RecentConversation = {
  id: string;
  initials: string;
  name: string;
  lastMessage: string;
  timeAgo: string;
  unread: boolean;
  online: boolean;
};

export type AutomationItem = {
  id: string;
  name: string;
  shotsToday: number;
  completionRatePct: number;
  active: boolean;
};

export const dashboardKpisMock: DashboardKpis = {
  sentToday: 247,
  sentVsYesterdayPct: 12,
  sentSparkline7d: [110, 145, 132, 160, 210, 190, 247],
  activeConversations: 18,
  unreadConversations: 3,
  responseRatePct: 87,
  avgResponseTime: "2min",
  newContacts7d: 34,
  newContactsToday: 8,
};

export const messagesChartByPeriodMock: Record<"7d" | "30d" | "90d", MessagesChartPoint[]> = {
  "7d": [
    { day: "Seg", sent: 180, received: 120 },
    { day: "Ter", sent: 210, received: 140 },
    { day: "Qua", sent: 165, received: 130 },
    { day: "Qui", sent: 240, received: 160 },
    { day: "Sex", sent: 300, received: 210 },
    { day: "Sáb", sent: 190, received: 150 },
    { day: "Dom", sent: 220, received: 170 },
  ],
  "30d": [
    { day: "Sem 1", sent: 1250, received: 920 },
    { day: "Sem 2", sent: 1480, received: 1100 },
    { day: "Sem 3", sent: 1710, received: 1320 },
    { day: "Sem 4", sent: 1620, received: 1210 },
  ],
  "90d": [
    { day: "Mês 1", sent: 5400, received: 4100 },
    { day: "Mês 2", sent: 6100, received: 4650 },
    { day: "Mês 3", sent: 6900, received: 5200 },
  ],
};

export const recentConversationsMock: RecentConversation[] = [
  {
    id: "c1",
    initials: "JS",
    name: "João Silva",
    lastMessage: "Obrigado pelo atendimento!",
    timeAgo: "5 min atrás",
    unread: true,
    online: true,
  },
  {
    id: "c2",
    initials: "MS",
    name: "Maria Santos",
    lastMessage: "Pode confirmar o horário pra amanhã às 14h?",
    timeAgo: "18 min atrás",
    unread: false,
    online: false,
  },
  {
    id: "c3",
    initials: "CO",
    name: "Carlos Oliveira",
    lastMessage: "Quais são as formas de pagamento?",
    timeAgo: "1h atrás",
    unread: true,
    online: true,
  },
  {
    id: "c4",
    initials: "AC",
    name: "Ana Costa",
    lastMessage: "Perfeito, vou fazer o Pix agora e te mando o comprovante.",
    timeAgo: "3h atrás",
    unread: false,
    online: false,
  },
  {
    id: "c5",
    initials: "PA",
    name: "Pedro Almeida",
    lastMessage: "Tem como me enviar os detalhes do produto novamente?",
    timeAgo: "Ontem",
    unread: false,
    online: false,
  },
  {
    id: "c6",
    initials: "LR",
    name: "Luana Ribeiro",
    lastMessage: "Fechamos! Pode agendar a visita para sábado?",
    timeAgo: "2 dias",
    unread: true,
    online: true,
  },
  {
    id: "c7",
    initials: "GM",
    name: "Gabriel Martins",
    lastMessage: "Tenho interesse no plano Pro, quais as diferenças?",
    timeAgo: "2 dias",
    unread: false,
    online: false,
  },
  {
    id: "c8",
    initials: "FS",
    name: "Fernanda Souza",
    lastMessage: "Consigo integrar com Google Sheets?",
    timeAgo: "3 dias",
    unread: false,
    online: true,
  },
  {
    id: "c9",
    initials: "RA",
    name: "Rafael Alves",
    lastMessage: "O bot pode mandar lembrete de pagamento?",
    timeAgo: "4 dias",
    unread: false,
    online: false,
  },
  {
    id: "c10",
    initials: "BT",
    name: "Beatriz Teixeira",
    lastMessage: "Ótimo! Obrigada 😊",
    timeAgo: "5 dias",
    unread: false,
    online: false,
  },
];

export const automationsMock: AutomationItem[] = [
  { id: "a1", name: "Boas-vindas Clientes", shotsToday: 127, completionRatePct: 89, active: true },
  { id: "a2", name: "Agendamento Consultas", shotsToday: 64, completionRatePct: 93, active: true },
  { id: "a3", name: "Carrinho Abandonado", shotsToday: 39, completionRatePct: 76, active: false },
  { id: "a4", name: "Pós-venda / NPS", shotsToday: 22, completionRatePct: 81, active: true },
  { id: "a5", name: "Reativação de Clientes", shotsToday: 18, completionRatePct: 68, active: false },
];
