import { PlayCircle, Smartphone, Users, Zap } from "lucide-react";
import type { OnboardingStepId } from "@/types/onboarding";

// Ajustado para as rotas reais existentes do projeto
export const ONBOARDING_STEPS_CONFIG = [
  {
    id: "whatsapp_connected" as OnboardingStepId,
    title: "Conecte seu WhatsApp",
    description: "Vincule sua conta do WhatsApp Business para começar a automatizar mensagens",
    order: 1,
    required: true,
    icon: Smartphone,
    action: {
      label: "Conectar WhatsApp",
      path: "/dashboard/whatsapp",
    },
    helpArticle: "/docs/connecting-whatsapp",
  },
  {
    id: "contacts_imported" as OnboardingStepId,
    title: "Importe seus contatos",
    description: "Adicione sua lista de contatos para poder enviar mensagens automáticas",
    order: 2,
    required: true,
    icon: Users,
    action: {
      label: "Importar contatos",
      path: "/dashboard/contatos",
    },
    helpArticle: "/docs/importing-contacts",
  },
  {
    id: "automation_created" as OnboardingStepId,
    title: "Crie sua primeira automação",
    description: "Monte um fluxo de mensagens automatizadas usando nosso editor visual",
    order: 3,
    required: true,
    icon: Zap,
    action: {
      label: "Criar automação",
      path: "/dashboard/automacoes",
    },
    helpArticle: "/docs/creating-automation",
  },
  {
    id: "automation_activated" as OnboardingStepId,
    title: "Ative sua automação",
    description: "Publique sua automação para começar a enviar mensagens",
    order: 4,
    required: true,
    icon: PlayCircle,
    action: {
      label: "Ver automações",
      path: "/dashboard/automacoes",
    },
    helpArticle: "/docs/activating-automation",
  },
] as const;
