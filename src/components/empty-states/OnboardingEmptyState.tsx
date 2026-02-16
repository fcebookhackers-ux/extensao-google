import { Rocket } from "lucide-react";

import { EmptyState } from "./EmptyState";

interface OnboardingEmptyStateProps {
  onStart: () => void;
}

export function OnboardingEmptyState({ onStart }: OnboardingEmptyStateProps) {
  return (
    <EmptyState
      icon={Rocket}
      title="Bem-vindo ao Zapfllow!"
      description="Configure sua conta em poucos passos e comece a automatizar suas mensagens do WhatsApp"
      primaryAction={{
        label: "Começar configuração",
        onClick: onStart,
      }}
      illustration={
        <div className="mb-4 h-64 w-64">
          <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="Ilustração de onboarding">
            <circle cx="100" cy="100" r="80" fill="hsl(var(--muted))" />
            <path
              d="M100 60 L100 140 M60 100 L140 100"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>
        </div>
      }
      variant="centered"
    />
  );
}
