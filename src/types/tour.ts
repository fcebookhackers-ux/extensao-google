import type { Step } from "react-joyride";

export interface TourStep extends Step {
  id: string;
  hideBackButton?: boolean;
}

export type TourId =
  | "onboarding"
  | "automations"
  | "automation-editor"
  | "webhook-config"
  | "contact-management"
  | "analytics";
