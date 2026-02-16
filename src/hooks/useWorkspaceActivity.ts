 import { useQuery, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/providers/AuthProvider";
 import { useEffect, useMemo } from "react";
 import type { ActivityEvent, ActivityFilters } from "@/types/activity";
 
 export function useWorkspaceActivity(workspaceId: string | null, filters?: ActivityFilters) {
   const { user } = useAuth();
   const queryClient = useQueryClient();
 
   const query = useQuery({
     queryKey: ["workspace-activity", workspaceId, filters],
     queryFn: async () => {
       if (!workspaceId) return [];
 
       let query = supabase
         .from("audit_events")
         .select("*")
         .eq("workspace_id", workspaceId)
         .order("created_at", { ascending: false })
         .limit(100);
 
       if (filters?.eventType) {
         query = query.eq("action", filters.eventType);
       }
       if (filters?.userId) {
         query = query.eq("user_id", filters.userId);
       }
       if (filters?.startDate) {
         query = query.gte("created_at", filters.startDate);
       }
       if (filters?.endDate) {
         query = query.lte("created_at", filters.endDate);
       }
 
       const { data, error } = await query;
       if (error) throw error;
       return (data || []) as ActivityEvent[];
     },
     enabled: !!workspaceId && !!user,
   });
 
   // Realtime subscription
   useEffect(() => {
     if (!workspaceId || !user) return;
 
     const channel = supabase
       .channel(`workspace-activity:${workspaceId}`)
       .on(
         "postgres_changes",
         {
           event: "INSERT",
           schema: "public",
           table: "audit_events",
           filter: `workspace_id=eq.${workspaceId}`,
         },
         (payload) => {
           queryClient.setQueryData<ActivityEvent[]>(
             ["workspace-activity", workspaceId, filters],
             (old) => [payload.new as ActivityEvent, ...(old || [])]
           );
         }
       )
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [workspaceId, user, queryClient, filters]);
 
   return query;
 }
 
 export function useGroupedActivities(events: ActivityEvent[]) {
   return useMemo(() => {
     const grouped: Record<string, ActivityEvent[]> = {};
     events.forEach((event) => {
       const date = new Date(event.created_at).toISOString().split("T")[0];
       if (!grouped[date]) grouped[date] = [];
       grouped[date].push(event);
     });
     return grouped;
   }, [events]);
 }