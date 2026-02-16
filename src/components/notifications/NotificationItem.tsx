import * as React from "react";
import { Archive, Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { priorityLabel, priorityVariant, typeLabel } from "@/components/notifications/notification-utils";
import type { NotificationRow } from "@/types/notifications";

type NotificationItemProps = {
  notification: NotificationRow;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
  onOpenAction?: (actionUrl: string) => void;
};

export function NotificationItem({ notification, onMarkRead, onArchive, onOpenAction }: NotificationItemProps) {
  const createdAt = new Date(notification.created_at);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!notification.read) onMarkRead(notification.id);
        if (notification.action_url && onOpenAction) onOpenAction(notification.action_url);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!notification.read) onMarkRead(notification.id);
          if (notification.action_url && onOpenAction) onOpenAction(notification.action_url);
        }
      }}
      className={cn(
        "group relative rounded-md border p-3 transition-colors",
        notification.read ? "bg-background" : "bg-accent/40",
      )}
    >
      {!notification.read ? (
        <span
          aria-hidden="true"
          className="absolute left-2 top-2 h-2 w-2 rounded-full bg-primary"
        />
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-sm font-medium">{notification.title}</div>
            <Badge variant={priorityVariant(notification.priority)} className="h-5">
              {priorityLabel(notification.priority)}
            </Badge>
            <span className="text-xs text-muted-foreground">{typeLabel(notification.type)}</span>
          </div>

          <div className="text-sm text-muted-foreground">{notification.message}</div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{createdAt.toLocaleString()}</span>
            {notification.action_label ? <span className="font-medium">{notification.action_label} →</span> : null}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!notification.read ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              title="Marcar como lida"
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(notification.id);
              }}
            >
              <Check />
            </Button>
          ) : null}

          <Button
            type="button"
            size="icon"
            variant="ghost"
            title="Arquivar"
            onClick={(e) => {
              e.stopPropagation();
              onArchive(notification.id);
            }}
          >
            <Archive />
          </Button>
        </div>
      </div>
    </div>
  );
}
