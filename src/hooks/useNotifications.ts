import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { NotificationPreferencesRow, NotificationRow } from "@/types/notifications";

type NotificationsQueryParams = {
  includeArchived?: boolean;
  onlyUnread?: boolean;
  limit?: number;
};

export function useNotifications(params: NotificationsQueryParams = {}) {
  const queryClient = useQueryClient();
  const { includeArchived = false, onlyUnread = false, limit = 50 } = params;

  const query = useQuery({
    queryKey: ["notifications", { includeArchived, onlyUnread, limit }],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Você precisa estar autenticado para visualizar notificações");

      let q = supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!includeArchived) q = q.eq("archived", false);
      if (onlyUnread) q = q.eq("read", false);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });

  // Realtime: invalida inbox + contador ao receber mudanças.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!active || !user) return;

      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
          },
        )
        .subscribe();
    })();

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return 0;

      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("read", false)
        .eq("archived", false);

      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase.rpc("mark_notification_read", {
        p_notification_id: notificationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("mark_all_notifications_read");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useArchiveNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase.rpc("archive_notification", {
        p_notification_id: notificationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data as NotificationPreferencesRow;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<NotificationPreferencesRow>) => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("notification_preferences")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });
}
