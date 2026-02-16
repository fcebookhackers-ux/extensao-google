import { useMemo } from "react";
import { validateAutomationFlow } from "@/lib/automation-validator";
import type { AutomationFlow, ValidationResult } from "@/types/automation-validation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

interface FlowValidatorProps {
  flow: AutomationFlow;
  onBlockClick?: (blockId: string) => void;
  validation?: ValidationResult;
  className?: string;
}

export function FlowValidator({ flow, onBlockClick, validation: provided, className }: FlowValidatorProps) {
  const validation = useMemo(() => provided ?? validateAutomationFlow(flow), [flow, provided]);

  if (validation.isValid && validation.warnings.length === 0) {
    return (
      <Alert className={className}>
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Fluxo válido</AlertTitle>
        <AlertDescription>Sua automação está pronta para ser publicada.</AlertDescription>
      </Alert>
    );
  }

  const { errors, warnings, infos } = validation;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Validação do fluxo</p>
          <p className="text-xs text-muted-foreground">Erros bloqueiam publicação; avisos podem ser ignorados.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {errors.length > 0 ? (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3.5 w-3.5" />
              {errors.length} {errors.length === 1 ? "erro" : "erros"}
            </Badge>
          ) : null}
          {warnings.length > 0 ? (
            <Badge variant="secondary" className="gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {warnings.length} {warnings.length === 1 ? "aviso" : "avisos"}
            </Badge>
          ) : null}
        </div>
      </div>

      <ScrollArea className="h-[260px] rounded-md border">
        <div className="space-y-2 p-3">
          {errors.map((e, i) => (
            <Alert key={`e-${i}`} variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>{e.message}</AlertTitle>
              <AlertDescription>
                {e.suggestion ? <p className="mt-1">Sugestão: {e.suggestion}</p> : null}
                {e.blockId && onBlockClick ? (
                  <button
                    type="button"
                    onClick={() => onBlockClick(e.blockId!)}
                    className="mt-2 text-left text-sm underline underline-offset-4 hover:no-underline"
                  >
                    Ir para o bloco
                  </button>
                ) : null}
              </AlertDescription>
            </Alert>
          ))}

          {warnings.map((w, i) => (
            <Alert key={`w-${i}`}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{w.message}</AlertTitle>
              <AlertDescription>
                {w.suggestion ? <p className="mt-1">Sugestão: {w.suggestion}</p> : null}
                {w.blockId && onBlockClick ? (
                  <button
                    type="button"
                    onClick={() => onBlockClick(w.blockId!)}
                    className="mt-2 text-left text-sm underline underline-offset-4 hover:no-underline"
                  >
                    Ir para o bloco
                  </button>
                ) : null}
              </AlertDescription>
            </Alert>
          ))}

          {infos.map((info, i) => (
            <Alert key={`i-${i}`}>
              <Info className="h-4 w-4" />
              <AlertTitle>{info.message}</AlertTitle>
              <AlertDescription>{info.suggestion ?? ""}</AlertDescription>
            </Alert>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
