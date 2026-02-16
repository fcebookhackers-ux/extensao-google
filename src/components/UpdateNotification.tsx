import * as React from "react";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import { Button } from "@/components/ui/button";

export function UpdateNotification() {
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();

  if (!updateAvailable) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-lg border bg-background p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Atualização disponível</p>
          <p className="text-sm text-muted-foreground">Uma nova versão do ZapFllow está disponível.</p>
        </div>
        <Button onClick={applyUpdate} className="sm:shrink-0">
          Atualizar agora
        </Button>
      </div>
    </div>
  );
}
