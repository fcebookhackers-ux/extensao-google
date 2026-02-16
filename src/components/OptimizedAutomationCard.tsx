import { memo } from "react";

import type { AutomationListItem } from "@/hooks/useAutomations";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AutomationCardProps {
  automation: AutomationListItem;
  onClick: (automation: AutomationListItem) => void;
}

export const OptimizedAutomationCard = memo(
  function AutomationCard({ automation, onClick }: AutomationCardProps) {
    return (
      <Card
        className="flex cursor-pointer items-center justify-between gap-3 border bg-background px-4 py-3 hover:bg-accent/40"
        onClick={() => onClick(automation)}
      >
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{automation.name}</span>
            <Badge variant={automation.status === "active" ? "default" : "outline"}>{automation.status}</Badge>
          </div>
        </div>
      </Card>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.automation.id === nextProps.automation.id &&
      prevProps.automation.name === nextProps.automation.name &&
      prevProps.automation.status === nextProps.automation.status &&
      prevProps.automation.updated_at === nextProps.automation.updated_at
    );
  },
);
