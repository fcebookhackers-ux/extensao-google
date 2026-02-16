import * as React from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useArchiveNotification, useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications, useUnreadNotificationsCount } from "@/hooks/useNotifications";
import { priorityLabel, priorityVariant, typeLabel } from "@/components/notifications/notification-utils";

export function NotificationsBell({ className }: { className?: string }) {
  const navigate = useNavigate();
  const unreadCountQuery = useUnreadNotificationsCount();
  const notificationsQuery = useNotifications({ limit: 10, includeArchived: false });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const archive = useArchiveNotification();

  const unreadCount = unreadCountQuery.data ?? 0;
  const items = notificationsQuery.data ?? [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted",
            className,
          )}
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="text-sm font-semibold">Notificações</div>
            <div className="text-xs text-muted-foreground">{unreadCount} não lidas</div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => markAllRead.mutate()}
            disabled={unreadCount === 0 || markAllRead.isPending}
          >
            Marcar todas
          </Button>
        </div>

        <div className="max-h-[420px] overflow-auto p-2">
          {items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Sem notificações por enquanto.</div>
          ) : (
            <div className="space-y-2">
              {items.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "rounded-md border p-3",
                    !n.read ? "bg-accent/40" : "bg-background",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-medium">{n.title}</div>
                        <Badge variant={priorityVariant(n.priority)} className="h-5">
                          {priorityLabel(n.priority)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{typeLabel(n.type)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">{n.message}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    {!n.read && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markRead.mutate(n.id)}
                        disabled={markRead.isPending}
                      >
                        Marcar como lida
                      </Button>
                    )}

                    {n.action_url ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!n.read) markRead.mutate(n.id);
                          navigate(n.action_url);
                        }}
                      >
                        {n.action_label ?? "Abrir"}
                      </Button>
                    ) : null}

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => archive.mutate(n.id)}
                      disabled={archive.isPending}
                    >
                      Arquivar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t px-4 py-3">
          <Button variant="ghost" className="w-full" onClick={() => navigate("/dashboard/notificacoes")}
          >
            Ver inbox completa
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
