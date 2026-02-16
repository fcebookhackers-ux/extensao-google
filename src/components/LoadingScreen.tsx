import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Carregando..." }: LoadingScreenProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <div className="text-sm text-muted-foreground">{message}</div>
      </div>
    </div>
  );
}
