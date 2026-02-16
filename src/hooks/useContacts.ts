import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { BulkAction, Contact, ContactFilters } from "@/types/contacts";

function toRpcArgs(filters?: ContactFilters, extra?: { limit?: number; offset?: number }) {
  return {
    p_query: filters?.query || null,
    p_tags: filters?.tags?.length ? filters.tags : null,
    p_status: filters?.status || null,
    p_created_after: filters?.createdAfter?.toISOString() || null,
    p_created_before: filters?.createdBefore?.toISOString() || null,
    p_limit: extra?.limit ?? 50,
    p_offset: extra?.offset ?? 0,
  };
}

export function useContacts(filters?: ContactFilters) {
  return useQuery({
    queryKey: ["contacts", filters ?? null],
    queryFn: async (): Promise<Contact[]> => {
      const { data, error } = await supabase.rpc("search_contacts", toRpcArgs(filters, { limit: 100, offset: 0 }));
      if (error) throw error;
      return (data ?? []) as unknown as Contact[];
    },
  });
}

// Infinite scroll / listas grandes
export function useInfiniteContacts(filters?: ContactFilters) {
  return useInfiniteQuery({
    queryKey: ["contacts-infinite", filters ?? null],
    queryFn: async ({ pageParam }) => {
      const offset = typeof pageParam === "number" ? pageParam : 0;
      const limit = 50;
      const { data, error } = await supabase.rpc("search_contacts", toRpcArgs(filters, { limit, offset }));
      if (error) throw error;

      const rows = (data ?? []) as unknown as Contact[];
      return {
        data: rows,
        nextOffset: rows.length === limit ? offset + limit : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });
}

export function useBulkActions() {
  const queryClient = useQueryClient();

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({
      contactIds,
      action,
      payload,
    }: {
      contactIds: string[];
      action: BulkAction;
      payload?: any;
    }) => {
      if (!contactIds.length) return;

      switch (action) {
        case "add_tags": {
          const tags = (payload?.tags ?? []) as string[];
          const { error } = await supabase.rpc("contacts_add_tags", {
            p_contact_ids: contactIds,
            p_tags: tags,
          });
          if (error) throw error;
          break;
        }
        case "remove_tags": {
          const tags = (payload?.tags ?? []) as string[];
          const { error } = await supabase.rpc("contacts_remove_tags", {
            p_contact_ids: contactIds,
            p_tags: tags,
          });
          if (error) throw error;
          break;
        }
        case "change_status": {
          const status = payload?.status as string | undefined;
          const { error } = await supabase.rpc("contacts_change_status", {
            p_contact_ids: contactIds,
            p_status: status ?? null,
          });
          if (error) throw error;
          break;
        }
        case "delete": {
          const { error } = await supabase.rpc("contacts_delete", {
            p_contact_ids: contactIds,
          });
          if (error) throw error;
          break;
        }
        case "export": {
          // Em seguida podemos implementar exportação (CSV) via Edge Function.
          throw new Error("Exportação ainda não implementada");
        }
      }
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["contacts"] });
      await queryClient.invalidateQueries({ queryKey: ["contacts-infinite"] });
      toast.success(`${variables.contactIds.length} contatos atualizados`);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar contatos");
      console.error(error);
    },
  });

  return {
    bulkUpdate: bulkUpdateMutation.mutate,
    isUpdating: bulkUpdateMutation.isPending,
  };
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name?: string; phone: string; email?: string | null; tags?: string[] }) => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error("Sessão inválida");

      // Placeholder quando vier "só telefone"
      const fallbackName = payload.phone;
      const name = (payload.name ?? "").trim() || fallbackName;

      const { data, error } = await supabase
        .from("contacts")
        .insert({
        user_id: userId,
          name,
        phone: payload.phone,
        email: payload.email ?? null,
        tags: payload.tags ?? [],
        status: "active",
        custom_fields: {},
        })
        .select("id, name, phone")
        .maybeSingle();

      if (error) throw error;

      // Disparo "automático" pós-INSERT (no fluxo de criação da UI)
      // Só tenta enriquecer quando o nome é placeholder (ex.: igual ao telefone).
      const shouldEnrich = Boolean(data?.id) && (name === payload.phone);
      if (shouldEnrich && data?.id) {
        // best-effort: não bloquear a criação se a IA falhar
        supabase.functions
          .invoke("enrich-contact", { body: { contactId: data.id } })
          .then(({ error: fnErr }) => {
            if (fnErr) console.warn("enrich-contact invoke failed", fnErr);
          })
          .catch((e) => console.warn("enrich-contact invoke error", e));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contacts"] });
      await queryClient.invalidateQueries({ queryKey: ["contacts-infinite"] });
      toast.success("Contato criado");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Não foi possível criar o contato");
    },
  });
}

export function useAvailableTags() {
  return useQuery({
    queryKey: ["available-tags"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from("contacts").select("tags").limit(1000);
      if (error) throw error;

      const all = new Set<string>();
      (data ?? []).forEach((row: any) => {
        (row?.tags ?? []).forEach((t: any) => {
          if (typeof t === "string" && t.trim()) all.add(t.trim());
        });
      });

      return Array.from(all).sort((a, b) => a.localeCompare(b));
    },
    staleTime: 5 * 60 * 1000,
  });
}
