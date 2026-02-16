 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 import { useEffect } from "react";
 
 export type EntityType = "automation" | "webhook" | "contact";
 
 export interface Comment {
   id: string;
   workspace_id: string;
   entity_type: EntityType;
   entity_id: string;
   user_id: string;
   comment_text: string;
   parent_comment_id: string | null;
   created_at: string;
   updated_at: string;
   deleted_at: string | null;
 }
 
 export interface CommentRead {
   id: string;
   workspace_id: string;
   entity_type: EntityType;
   entity_id: string;
   user_id: string;
   last_read_at: string;
   created_at: string;
   updated_at: string;
 }
 
 export function useEntityComments(entityType: EntityType, entityId: string, workspaceId?: string) {
   const queryClient = useQueryClient();
 
   const query = useQuery({
     queryKey: ["entity-comments", entityType, entityId],
     queryFn: async (): Promise<Comment[]> => {
       const { data, error } = await supabase
         .from("entity_comments")
         .select("*")
         .eq("entity_type", entityType)
         .eq("entity_id", entityId)
         .is("deleted_at", null)
         .order("created_at", { ascending: true });
 
       if (error) throw error;
       return (data ?? []) as Comment[];
     },
     enabled: !!entityId,
   });
 
   // Realtime subscription
   useEffect(() => {
     if (!entityId) return;
 
     const channel = supabase
       .channel(`comments:${entityType}:${entityId}`)
       .on(
         "postgres_changes",
         {
           event: "*",
           schema: "public",
           table: "entity_comments",
           filter: `entity_id=eq.${entityId}`,
         },
         () => {
           void queryClient.invalidateQueries({ queryKey: ["entity-comments", entityType, entityId] });
         }
       )
       .subscribe();
 
     return () => {
       void supabase.removeChannel(channel);
     };
   }, [entityType, entityId, queryClient]);
 
   const addMutation = useMutation({
     mutationFn: async ({
       text,
       parentId,
     }: {
       text: string;
       parentId?: string;
     }) => {
       const { data: authData } = await supabase.auth.getUser();
       const userId = authData.user?.id;
       if (!userId) throw new Error("Não autenticado");
       if (!workspaceId) throw new Error("workspace_id necessário para comentar");
 
       const { error } = await supabase.from("entity_comments").insert({
         workspace_id: workspaceId,
         entity_type: entityType,
         entity_id: entityId,
         user_id: userId,
         comment_text: text,
         parent_comment_id: parentId ?? null,
       });
 
       if (error) throw error;
     },
     onSuccess: () => {
       void queryClient.invalidateQueries({ queryKey: ["entity-comments", entityType, entityId] });
       toast.success("Comentário adicionado");
     },
     onError: (error) => {
       console.error(error);
       toast.error("Erro ao adicionar comentário");
     },
   });
 
   const updateMutation = useMutation({
     mutationFn: async ({ commentId, text }: { commentId: string; text: string }) => {
       const { error } = await supabase
         .from("entity_comments")
         .update({ comment_text: text })
         .eq("id", commentId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       void queryClient.invalidateQueries({ queryKey: ["entity-comments", entityType, entityId] });
       toast.success("Comentário atualizado");
     },
     onError: () => {
       toast.error("Erro ao atualizar comentário");
     },
   });
 
   const softDeleteMutation = useMutation({
     mutationFn: async (commentId: string) => {
       const { error } = await supabase
         .from("entity_comments")
         .update({ deleted_at: new Date().toISOString() })
         .eq("id", commentId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       void queryClient.invalidateQueries({ queryKey: ["entity-comments", entityType, entityId] });
       toast.success("Comentário excluído");
     },
     onError: () => {
       toast.error("Erro ao excluir comentário");
     },
   });
 
   const markAsReadMutation = useMutation({
     mutationFn: async () => {
       const { data: authData } = await supabase.auth.getUser();
       const userId = authData.user?.id;
       if (!userId || !workspaceId) return;
 
       const { error } = await supabase.from("entity_comment_reads").upsert(
         {
           workspace_id: workspaceId,
           entity_type: entityType,
           entity_id: entityId,
           user_id: userId,
           last_read_at: new Date().toISOString(),
         },
         { onConflict: "user_id,entity_type,entity_id" }
       );
 
       if (error) throw error;
     },
     onSuccess: () => {
       void queryClient.invalidateQueries({ queryKey: ["comment-unread", entityType, entityId] });
     },
   });
 
   return {
     comments: query.data ?? [],
     isLoading: query.isLoading,
     isError: query.isError,
     addComment: addMutation.mutate,
     isAdding: addMutation.isPending,
     updateComment: updateMutation.mutate,
     isUpdating: updateMutation.isPending,
     deleteComment: softDeleteMutation.mutate,
     isDeleting: softDeleteMutation.isPending,
     markAsRead: markAsReadMutation.mutate,
   };
 }
 
 export function useUnreadComments(entityType: EntityType, entityId: string) {
   return useQuery({
     queryKey: ["comment-unread", entityType, entityId],
     queryFn: async (): Promise<number> => {
       const { data: authData } = await supabase.auth.getUser();
       const userId = authData.user?.id;
       if (!userId || !entityId) return 0;
 
       // Get user's last read timestamp
       const { data: readData } = await supabase
         .from("entity_comment_reads")
         .select("last_read_at")
         .eq("entity_type", entityType)
         .eq("entity_id", entityId)
         .eq("user_id", userId)
         .maybeSingle();
 
       const lastReadAt = readData?.last_read_at;
 
       // Count comments after last read
       const { count, error } = await supabase
         .from("entity_comments")
         .select("*", { count: "exact", head: true })
         .eq("entity_type", entityType)
         .eq("entity_id", entityId)
         .is("deleted_at", null)
         .gt("created_at", lastReadAt ?? "1970-01-01T00:00:00Z");
 
       if (error) throw error;
       return count ?? 0;
     },
     enabled: !!entityId,
   });
 }