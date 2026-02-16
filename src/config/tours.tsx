import type { TourStep } from "@/types/tour";

export const ONBOARDING_TOUR: TourStep[] = [
  {
    id: "welcome",
    target: "body",
    content: (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">👋 Bem-vindo ao Zapfllow!</h2>
        <p>
          Vamos fazer um tour rápido para você conhecer as principais
          funcionalidades da plataforma.
        </p>
        <p>Isso levará apenas 2 minutos. Você pode pular a qualquer momento.</p>
      </div>
    ),
    placement: "center",
    hideBackButton: true,
  },
  {
    id: "sidebar-automations",
    target: '[data-tour="sidebar-automations"]',
    content: (
      <div className="space-y-2">
        <h2 className="text-base font-semibold">📱 Automações</h2>
        <p>
          Aqui você cria e gerencia seus fluxos automatizados de mensagens do
          WhatsApp.
        </p>
      </div>
    ),
    placement: "right",
  },
  {
    id: "sidebar-contacts",
    target: '[data-tour="sidebar-contacts"]',
    content: (
      <div className="space-y-2">
        <h2 className="text-base font-semibold">👥 Contatos</h2>
        <p>
          Gerencie sua lista de contatos, importe em lote e organize com tags.
        </p>
      </div>
    ),
    placement: "right",
  },
  {
    id: "create-automation",
    target: '[data-tour="create-automation-btn"]',
    content: (
      <div className="space-y-2">
        <h2 className="text-base font-semibold">✨ Criar Automação</h2>
        <p>
          Clique aqui para começar a criar sua primeira automação. Use nosso
          editor visual intuitivo de arrastar e soltar.
        </p>
      </div>
    ),
    placement: "bottom",
  },
  {
    id: "analytics",
    target: '[data-tour="sidebar-analytics"]',
    content: (
      <div className="space-y-2">
        <h2 className="text-base font-semibold">📊 Analytics</h2>
        <p>
          Acompanhe métricas detalhadas: taxa de entrega, leitura, respostas e
          muito mais.
        </p>
      </div>
    ),
    placement: "right",
  },
  {
    id: "help-center",
    target: '[data-tour="help-button"]',
    content: (
      <div className="space-y-2">
        <h2 className="text-base font-semibold">❓ Central de Ajuda</h2>
        <p>
          Precisa de ajuda? Clique aqui para acessar documentação, tutoriais em
          vídeo e suporte.
        </p>
      </div>
    ),
    placement: "left",
  },
  {
    id: "complete",
    target: "body",
    content: (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">🎉 Tour Concluído!</h2>
        <p>
          Agora você está pronto para começar. Explore a plataforma e não hesite
          em usar o botão de ajuda se precisar.
        </p>
        <p>
          Dica: Você pode refazer este tour a qualquer momento no menu de ajuda.
        </p>
      </div>
    ),
    placement: "center",
  },
];

export const AUTOMATIONS_TOUR: TourStep[] = [
  {
    id: "create-automation",
    target: '[data-tour="create-automation-btn"]',
    content: "Comece criando sua primeira automação aqui!",
    disableBeacon: true,
    placement: "bottom",
  },
];

export const AUTOMATION_EDITOR_TOUR: TourStep[] = [
  {
    id: "editor",
    target: '[data-tour="automation-editor"]',
    content: "Use o editor visual para construir fluxos sem código.",
    disableBeacon: true,
    placement: "center",
  },
  {
    id: "canvas",
    target: '[data-tour="automation-canvas"]',
    content: (
      <div className="space-y-2">
        <h2 className="text-base font-semibold">🎨 Canvas de Edição</h2>
        <p>
          Arraste blocos da biblioteca para o canvas e conecte-os para criar seu
          fluxo de automação.
        </p>
      </div>
    ),
    placement: "left",
  },
  {
    id: "blocks-library",
    target: '[data-tour="blocks-library"]',
    content: (
      <div className="space-y-2">
        <h2 className="text-base font-semibold">🧩 Biblioteca de Blocos</h2>
        <p>Escolha entre mensagens, perguntas, condições, delays e ações.</p>
      </div>
    ),
    placement: "left",
  },
  {
    id: "validation",
    target: '[data-tour="flow-validator"]',
    content: (
      <div className="space-y-2">
        <h2 className="text-base font-semibold">✓ Validador de Fluxo</h2>
        <p>
          O validador identifica erros em tempo real, como blocos órfãos ou
          variáveis não declaradas.
        </p>
      </div>
    ),
    placement: "left",
  },
  {
    id: "publish",
    target: '[data-tour="publish-button"]',
    content: (
      <div className="space-y-2">
        <h2 className="text-base font-semibold">🚀 Publicar</h2>
        <p>Quando estiver pronto, publique sua automação para ativá-la.</p>
      </div>
    ),
    placement: "bottom",
  },
];

export const WEBHOOK_CONFIG_TOUR: TourStep[] = [
  {
    id: "webhook-config",
    target: '[data-tour="webhook-config"]',
    content: "Configure webhooks para integrar com sistemas externos.",
    disableBeacon: true,
    placement: "bottom",
  },
];
