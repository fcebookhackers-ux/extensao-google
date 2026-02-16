import * as React from "react";
import { Bell, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  useArchiveNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationsCount,
} from "@/hooks/useNotifications";
import { NotificationItem } from "./NotificationItem";
import type { NotificationRow } from "@/types/notifications";

type Group = { label: string; key: string; notifications: NotificationRow[] };

function groupByDay(notifications: NotificationRow[]) {
  const groups = new Map<string, Group>();
  for (const n of notifications) {
    const d = new Date(n.created_at);
    const key = d.toLocaleDateString("pt-BR");
    const label = key === new Date().toLocaleDateString("pt-BR") ? "Hoje" : key;
    const g = groups.get(key) ?? { key, label, notifications: [] };
    g.notifications.push(n);
    groups.set(key, g);
  }
  return Array.from(groups.values());
}

export function NotificationCenter({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState<"all" | "unread">("all");

  const unreadCountQuery = useUnreadNotificationsCount();
  const notificationsQuery = useNotifications({ limit: 50, includeArchived: false });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const archive = useArchiveNotification();

  const unreadCount = unreadCountQuery.data ?? 0;
  const all = notificationsQuery.data ?? [];
  const filtered = filter === "unread" ? all.filter((n) => !n.read) : all;
  const grouped = groupByDay(filtered);

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
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[420px] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="text-sm font-semibold">Notificações</div>
            <div className="text-xs text-muted-foreground">{unreadCount} não lidas</div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAllRead.mutate()}
              disabled={unreadCount === 0 || markAllRead.isPending}
            >
              Marcar todas
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => navigate("/dashboard/configuracoes?tab=notifications")}
              aria-label="Preferências de notificações"
              title="Preferências"
            >
              <Settings />
            </Button>
          </div>
        </div>

        <div className="px-4 py-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="unread">Não lidas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="max-h-[460px] overflow-auto px-4 pb-4">
          {all.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Nenhuma notificação</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Nenhuma notificação não lida</div>
          ) : (
            <div className="space-y-4">
              {grouped.map((g) => (
                <div key={g.key} className="space-y-2">
                  <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-2 text-xs font-medium text-muted-foreground backdrop-blur">
                    {g.label}
                  </div>
                  <div className="space-y-2">
                    {g.notifications.map((n) => (
                      <NotificationItem
                        key={n.id}
                        notification={n}
                        onMarkRead={(id) => markRead.mutate(id)}
                        onArchive={(id) => archive.mutate(id)}
                        onOpenAction={(url) => navigate(url)}
                      />
                    ))}
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
