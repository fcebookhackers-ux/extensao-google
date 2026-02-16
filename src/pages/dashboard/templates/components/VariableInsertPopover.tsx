import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export function VariableInsertPopover({
  nextVar,
  max = 10,
  onInsert,
  disabled,
}: {
  nextVar: number;
  max?: number;
  onInsert: (token: string) => void;
  disabled?: boolean;
}) {
  const available = React.useMemo(() => {
    const start = Math.max(1, nextVar);
    const arr: number[] = [];
    for (let i = start; i <= max; i++) arr.push(i);
    return arr;
  }, [nextVar, max]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          <Plus className="h-4 w-4" /> Inserir Variável
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Variáveis</p>
            <p className="text-xs text-muted-foreground">Variáveis serão substituídas por valores reais ao enviar.</p>
          </div>

          {available.length ? (
            <div className="flex flex-wrap gap-2">
              {available.map((n) => (
                <button
                  key={n}
                  type="button"
                  className="rounded-md border bg-background px-2 py-1 text-sm hover:bg-accent"
                  onClick={() => onInsert(`{{${n}}}`)}
                >
                  <Badge variant="outline" className="font-mono">
                    {`{{${n}}}`}
                  </Badge>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Limite de {max} variáveis atingido.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
