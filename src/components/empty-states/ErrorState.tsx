import { AlertCircle, RefreshCw } from "lucide-react";

import { EmptyState } from "./EmptyState";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Algo deu errado",
  description = "Ocorreu um erro ao carregar os dados. Por favor, tente novamente.",
  onRetry,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description}
      primaryAction={{
        label: "Tentar novamente",
        onClick: onRetry ?? (() => window.location.reload()),
        icon: RefreshCw,
      }}
      variant="centered"
    />
  );
}
