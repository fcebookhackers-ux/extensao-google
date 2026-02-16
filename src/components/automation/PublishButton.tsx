import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FlowValidator } from "@/components/automation/FlowValidator";
import { validateAutomationFlow } from "@/lib/automation-validator";
import type { AutomationFlow } from "@/types/automation-validation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, PlayCircle } from "lucide-react";

interface PublishButtonProps {
  flow: AutomationFlow;
  onPublish: () => void | Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export function PublishButton({ flow, onPublish, isLoading, className }: PublishButtonProps) {
  const [showValidation, setShowValidation] = useState(false);
  const validation = useMemo(() => validateAutomationFlow(flow), [flow]);
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  const handlePublishClick = () => {
    if (hasErrors || hasWarnings) setShowValidation(true);
    else void onPublish();
  };

  const handleForcePublish = async () => {
    setShowValidation(false);
    await onPublish();
  };

  return (
    <>
      <Button onClick={handlePublishClick} disabled={isLoading} className={className} data-tour="publish-button">
        <PlayCircle className="h-4 w-4" />
        Publicar
      </Button>

      <Dialog open={showValidation} onOpenChange={setShowValidation}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              {hasErrors ? "Corrija os erros antes de publicar" : "Avisos detectados"}
            </DialogTitle>
            <DialogDescription>
              {hasErrors
                ? "Sua automação possui erros que precisam ser corrigidos."
                : "Sua automação possui avisos. Você pode publicar mesmo assim, mas recomendamos revisar."}
            </DialogDescription>
          </DialogHeader>

          <FlowValidator flow={flow} validation={validation} />

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowValidation(false)}>
              Cancelar
            </Button>
            {!hasErrors ? (
              <Button onClick={handleForcePublish}>Publicar mesmo assim</Button>
            ) : (
              <Button onClick={() => setShowValidation(false)}>Corrigir erros</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
