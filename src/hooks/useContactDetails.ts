import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Contact } from "@/types/contacts";

export function useContactDetails(contactId?: string | null) {
  return useQuery({
    queryKey: ["contact", contactId ?? null],
    enabled: Boolean(contactId),
    queryFn: async (): Promise<Contact> => {
      const { data, error } = await supabase.from("contacts").select("*").eq("id", contactId!).single();
      if (error) throw error;
      return data as unknown as Contact;
    },
  });
}

export function useReviewContactEnrichment() {
  const qc = useQueryClient();

  const accept = useMutation({
    mutationFn: async ({ contact }: { contact: Contact }) => {
      const existingTags = Array.isArray(contact.tags) ? contact.tags : [];
      const suggestedTags = Array.isArray(contact.ai_tags_suggestion) ? contact.ai_tags_suggestion : [];
      const nextTags = Array.from(new Set([...existingTags, ...suggestedTags].filter(Boolean)));

      const nameLooksLikePlaceholder = (contact.name || "").trim() === (contact.phone || "").trim();
      const nextName = nameLooksLikePlaceholder && contact.ai_name_suggestion ? contact.ai_name_suggestion : contact.name;

      const { error } = await supabase
        .from("contacts")
        .update({
          name: nextName,
          tags: nextTags,
          ai_review_status: "accepted",
          ai_reviewed_at: new Date().toISOString(),
        })
        .eq("id", contact.id);

      if (error) throw error;
    },
    onSuccess: async (_, vars) => {
      await qc.invalidateQueries({ queryKey: ["contact", vars.contact.id] });
      await qc.invalidateQueries({ queryKey: ["contacts"] });
      await qc.invalidateQueries({ queryKey: ["contacts-infinite"] });
    },
  });

  const reject = useMutation({
    mutationFn: async ({ contactId }: { contactId: string }) => {
      const { error } = await supabase
        .from("contacts")
        .update({
          ai_review_status: "rejected",
          ai_reviewed_at: new Date().toISOString(),
        })
        .eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: async (_, vars) => {
      await qc.invalidateQueries({ queryKey: ["contact", vars.contactId] });
      await qc.invalidateQueries({ queryKey: ["contacts"] });
      await qc.invalidateQueries({ queryKey: ["contacts-infinite"] });
    },
  });

  return {
    accept,
    reject,
  };
}

export function useEnrichContact() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId }: { contactId: string }) => {
      const { data, error } = await supabase.functions.invoke("enrich-contact", { body: { contactId } });
      if (error) throw error;
      return data as any;
    },
    onSuccess: async (_, vars) => {
      await qc.invalidateQueries({ queryKey: ["contact", vars.contactId] });
      await qc.invalidateQueries({ queryKey: ["contacts"] });
      await qc.invalidateQueries({ queryKey: ["contacts-infinite"] });
    },
  });
}
