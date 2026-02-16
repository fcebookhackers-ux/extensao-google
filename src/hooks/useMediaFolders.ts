import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type MediaFolder = {
  id: string;
  name: string;
  parent_id: string | null;
  position: number;
  color: string;
  icon: string | null;
};

export function useMediaFolders() {
  return useQuery({
    queryKey: ["media-folders"],
    queryFn: async (): Promise<MediaFolder[]> => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("media_folders")
        .select("id,name,parent_id,position,color,icon")
        .eq("user_id", user.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as MediaFolder[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
