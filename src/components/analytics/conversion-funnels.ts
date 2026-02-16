export type FunnelStepDef = {
  step: string;
  name: string;
};

export type FunnelId = keyof typeof funnels;

export const funnels = {
  onboarding: [
    { step: "signup_completed", name: "Cadastro" },
    // usa os nomes de eventos já existentes no produto quando possível
    { step: "automation.created", name: "Primeira Automação" },
    { step: "automation.published", name: "Automação Publicada" },
    { step: "webhook.executed", name: "Webhook Executado" },
  ],
  feature_adoption: [
    { step: "feature.viewed", name: "Visualizou" },
    { step: "feature.clicked", name: "Clicou" },
    { step: "feature.completed", name: "Completou" },
  ],
} as const;
