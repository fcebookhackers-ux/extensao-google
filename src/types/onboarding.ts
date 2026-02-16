import type * as React from "react";

export type OnboardingStepId =
  | "whatsapp_connected"
  | "contacts_imported"
  | "automation_created"
  | "automation_activated"
  | "onboarding_completed";

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  order: number;
  icon: React.ComponentType<{ className?: string }>;
  action?: {
    label: string;
    path?: string;
    onClick?: () => void;
  };
  helpArticle?: string;
}

export interface OnboardingProgress {
  whatsapp_connected: boolean;
  contacts_imported: boolean;
  automation_created: boolean;
  automation_activated: boolean;
  completed_at: string | null;
}
