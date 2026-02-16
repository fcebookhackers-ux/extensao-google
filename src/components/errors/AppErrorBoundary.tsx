import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Evita logar dados sensíveis; apenas sinaliza o erro no console.
    console.error("AppErrorBoundary:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-background p-6 text-center">
          <AlertCircle className="mb-4 h-16 w-16 text-destructive" />
          <h1 className="text-2xl font-bold">Algo deu errado</h1>
          <p className="mt-2 text-sm text-muted-foreground">Estamos trabalhando para resolver o problema</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Recarregar Página
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
