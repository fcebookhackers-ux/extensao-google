import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import type { AppRole } from "@/types/permissions";

export function useRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-role", user?.id ?? null],
    enabled: !!user,
    queryFn: async (): Promise<AppRole | null> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Role fetch error:", error);
        return "user";
      }

      // Segurança: ausência de role registrada nunca deve conceder privilégios.
      return ((data?.role as AppRole | undefined) ?? "user");
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
