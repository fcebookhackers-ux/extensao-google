import { Component, type ErrorInfo, type ReactNode } from "react";
import * as Sentry from "@sentry/react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-screen flex-col items-center justify-center bg-background p-6 text-center">
            <AlertCircle className="mb-4 h-16 w-16 text-destructive" />
            <h1 className="text-2xl font-bold">Algo deu errado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Nosso time foi notificado. Tente recarregar a página.
            </p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Recarregar
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
