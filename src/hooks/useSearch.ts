import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type {
  GlobalSearchResults,
  MediaSearchFilters,
  SavedSearch,
  WebhookSearchFilters,
} from "@/types/search";

type MediaSearchRow = {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  folder_id: string | null;
  thumbnail_url: string | null;
  created_at: string;
  match_score: number;
};

type WebhookSearchRow = {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  events: string[];
  created_at: string;
  match_score: number;
};

function mapSavedSearch(row: any): SavedSearch {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    searchType: row.search_type,
    filters: row.filters,
    isFavorite: row.is_favorite,
    lastUsedAt: row.last_used_at,
    useCount: row.use_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as SavedSearch;
}

export function useMediaSearch(filters: MediaSearchFilters) {
  return useQuery({
    queryKey: ["media-search", filters],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("search_media", {
        p_query: filters.query ?? null,
        p_file_types: filters.fileTypes ?? null,
        p_mime_types: filters.mimeTypes ?? null,
        p_folder_ids: filters.folderIds ?? null,
        p_tag_ids: filters.tagIds ?? null,
        p_min_size: filters.minSize ?? null,
        p_max_size: filters.maxSize ?? null,
        p_date_from: filters.dateFrom ? filters.dateFrom.toISOString() : null,
        p_date_to: filters.dateTo ? filters.dateTo.toISOString() : null,
        p_limit: filters.limit ?? 50,
        p_offset: filters.offset ?? 0,
      });

      if (error) throw error;
      return (data ?? []) as MediaSearchRow[];
    },
    enabled: Object.keys(filters).length > 0,
  });
}

export function useWebhookSearch(filters: WebhookSearchFilters) {
  return useQuery({
    queryKey: ["webhook-search", filters],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("search_webhooks", {
        p_query: filters.query ?? null,
        p_is_active: typeof filters.isActive === "boolean" ? filters.isActive : null,
        p_events: filters.events ?? null,
        p_has_failures: typeof filters.hasFailures === "boolean" ? filters.hasFailures : null,
        p_circuit_state: filters.circuitState ?? null,
        p_limit: filters.limit ?? 50,
        p_offset: filters.offset ?? 0,
      });

      if (error) throw error;
      return (data ?? []) as WebhookSearchRow[];
    },
    enabled: Object.keys(filters).length > 0,
  });
}

export function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: ["global-search", query],
    queryFn: async () => {
      if (!query || query.trim().length < 2) {
        return { media: [], webhooks: [], folders: [], tags: [] } as GlobalSearchResults;
      }

      const { data, error } = await (supabase as any).rpc("global_search", {
        p_query: query.trim(),
        p_limit: 20,
      });

      if (error) throw error;
      return (data ?? { media: [], webhooks: [], folders: [], tags: [] }) as unknown as GlobalSearchResults;
    },
    enabled: query.trim().length >= 2,
  });
}

export function useSavedSearches(searchType?: SavedSearch["searchType"]) {
  return useQuery({
    queryKey: ["saved-searches", searchType ?? "all"],
    queryFn: async () => {
      let q = (supabase as any)
        .from("saved_searches")
        .select("*")
        .order("is_favorite", { ascending: false })
        .order("last_used_at", { ascending: false, nullsFirst: false });

      if (searchType) q = q.eq("search_type", searchType);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(mapSavedSearch);
    },
  });
}

export function useCreateSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      searchType: SavedSearch["searchType"];
      filters: Record<string, any>;
      isFavorite?: boolean;
    }) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await (supabase as any)
        .from("saved_searches")
        .insert({
          user_id: user.id,
          name: params.name,
          description: params.description ?? null,
          search_type: params.searchType,
          filters: params.filters,
          is_favorite: params.isFavorite ?? false,
        })
        .select("*")
        .single();

      if (error) throw error;
      return mapSavedSearch(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
    },
  });
}

export function useUseSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (searchId: string) => {
      const { error } = await (supabase as any).rpc("use_saved_search", {
        p_search_id: searchId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
    },
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (searchId: string) => {
      const { error } = await (supabase as any)
        .from("saved_searches")
        .delete()
        .eq("id", searchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
    },
  });
}
