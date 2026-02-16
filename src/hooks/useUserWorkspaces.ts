import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

type UserWorkspace = {
  id: string;
  name: string | null;
};

/**
 * Lista workspaces visíveis para o usuário logado.
 * Usado principalmente para permitir selecionar o workspace atual no frontend.
 */
export function useUserWorkspaces() {
  return useQuery({
    queryKey: ["user-workspaces"],
    queryFn: async (): Promise<UserWorkspace[]> => {
      const { data, error } = await supabase.from("workspaces").select("id,name");
      if (error) throw error;
      return (data ?? []) as UserWorkspace[];
    },
  });
}
