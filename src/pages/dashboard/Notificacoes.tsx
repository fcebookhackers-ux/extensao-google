import * as React from "react";
import { Archive, Bell, CheckCheck } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useArchiveNotification, useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/hooks/useNotifications";
import { priorityLabel, priorityVariant, typeLabel } from "@/components/notifications/notification-utils";
import { useNavigate } from "react-router-dom";

type InboxTab = "unread" | "all" | "archived";

export default function DashboardNotificacoes() {
  const [tab, setTab] = React.useState<InboxTab>("unread");
  const navigate = useNavigate();

  const includeArchived = tab === "archived";
  const onlyUnread = tab === "unread";

  const notificationsQuery = useNotifications({ includeArchived, onlyUnread, limit: 200 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const archive = useArchiveNotification();

  const items = notificationsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Bell className="h-5 w-5 text-primary" />
            Notificações
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Sua inbox de alertas e eventos importantes</p>
        </div>
        <Button
          variant="outline"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
          className="gap-2"
        >
          <CheckCheck className="h-4 w-4" />
          Marcar todas como lidas
        </Button>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as InboxTab)}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="unread">Não lidas</TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="archived">Arquivadas</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{items.length} notificações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Sem notificações nesta aba.</div>
              ) : (
                items.map((n) => (
                  <div
                    key={n.id}
                    className={cn("rounded-md border p-3", !n.read ? "bg-accent/40" : "bg-background")}
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-medium">{n.title}</div>
                          <Badge variant={priorityVariant(n.priority)} className="h-5">
                            {priorityLabel(n.priority)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{typeLabel(n.type)}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">{n.message}</div>
                        <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                      </div>

                      <div className="flex flex-wrap gap-2 md:justify-end">
                        {!n.read && (
                          <Button size="sm" variant="outline" onClick={() => markRead.mutate(n.id)}>
                            Marcar lida
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

                        {tab !== "archived" && (
                          <Button size="sm" variant="secondary" onClick={() => archive.mutate(n.id)} className="gap-2">
                            <Archive className="h-4 w-4" />
                            Arquivar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
