import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import type { Permission } from "@/types/permissions";

type PermissionResult = boolean;

export function usePermission(permission: Permission) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["permission", user?.id ?? null, permission],
    enabled: !!user,
    queryFn: async (): Promise<PermissionResult> => {
      const { data, error } = await supabase.rpc("check_permission", {
        required_permission: permission,
      });

      if (error) {
        console.error("Permission check error:", error);
        return false;
      }

      return Boolean(data);
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function usePermissions(permissions: Permission[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["permissions", user?.id ?? null, ...permissions],
    enabled: !!user && permissions.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        permissions.map(async (permission) => {
          const { data, error } = await supabase.rpc("check_permission", {
            required_permission: permission,
          });

          if (error) {
            console.error("Permission check error:", { permission, error });
            return { permission, hasPermission: false as const };
          }

          return { permission, hasPermission: Boolean(data) };
        })
      );

      return results.reduce((acc, { permission, hasPermission }) => {
        acc[permission] = hasPermission;
        return acc;
      }, {} as Record<Permission, boolean>);
    },
    staleTime: 5 * 60 * 1000,
  });
}
