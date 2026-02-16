import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type MediaTag = {
  id: string;
  name: string;
  color: string;
};

export function useMediaTags() {
  return useQuery({
    queryKey: ["media-tags"],
    queryFn: async (): Promise<MediaTag[]> => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("media_tags")
        .select("id,name,color")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return (data ?? []) as MediaTag[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
