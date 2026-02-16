import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Edit, Pause, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type VirtualizedAutomationListItem = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  created_at: string;
  tags?: string[] | null;
};

interface VirtualizedAutomationListProps {
  automations: VirtualizedAutomationListItem[];
  onAutomationClick: (automation: VirtualizedAutomationListItem) => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
  className?: string;
  height?: number | string;
}

export function VirtualizedAutomationList({
  automations,
  onAutomationClick,
  onToggleStatus,
  className,
  height = "70vh",
}: VirtualizedAutomationListProps) {
  const parentRef = React.useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: automations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 3,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={cn("w-full overflow-auto", className)}
      style={{ height }}
    >
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {items.map((virtualItem) => {
          const automation = automations[virtualItem.index];
          const isActive = automation.status === "active";

          return (
            <div
              key={automation.id}
              className="absolute left-0 top-0 w-full px-1"
              style={{ transform: `translateY(${virtualItem.start}px)` }}
            >
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="truncate text-left text-sm font-semibold"
                        onClick={() => onAutomationClick(automation)}
                      >
                        {automation.name}
                      </button>
                      <Badge variant={isActive ? "default" : "secondary"}>
                        {isActive ? "Ativa" : "Pausada"}
                      </Badge>
                    </div>

                    {automation.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {automation.description}
                      </p>
                    ) : null}

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Criada{" "}
                        {formatDistanceToNow(new Date(automation.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>

                      {automation.tags?.length ? (
                        <span className="inline-flex items-center gap-1">
                          {automation.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onToggleStatus(automation.id, automation.status)}
                    >
                      {isActive ? (
                        <>
                          <Pause className="mr-2 h-4 w-4" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Ativar
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onAutomationClick(automation)}
                      aria-label="Editar automação"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
