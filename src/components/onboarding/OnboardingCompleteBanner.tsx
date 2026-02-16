import * as React from "react";
import { PartyPopper, X } from "lucide-react";

import { useOnboarding } from "@/hooks/useOnboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function OnboardingCompleteBanner() {
  const { isCompleted, progress } = useOnboarding();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!isCompleted) return;
    if (!progress?.completed_at) return;

    // Mostra só 1x por sessão de navegador
    try {
      const key = "onboarding_just_completed";
      if (sessionStorage.getItem(key) === "true") return;
      sessionStorage.setItem(key, "true");
    } catch {
      // ignore
    }

    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 10_000);
    return () => window.clearTimeout(t);
  }, [isCompleted, progress?.completed_at]);

  if (!visible) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-md border bg-muted p-2">
            <PartyPopper className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold">Parabéns! Você concluiu o onboarding</div>
            <div className="text-sm text-muted-foreground">
              Sua conta está configurada e pronta para uso. Agora você pode explorar todos os recursos do ZapFllow.
            </div>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button onClick={() => setVisible(false)}>Começar a usar</Button>
              <Button variant="outline" onClick={() => window.open("/docs/advanced-features", "_blank")}> 
                Ver recursos avançados
              </Button>
            </div>
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={() => setVisible(false)} aria-label="Fechar">
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
