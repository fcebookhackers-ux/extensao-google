import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermission } from "@/hooks/usePermission";
import type { Permission } from "@/types/permissions";

interface PermissionGuardProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showSkeleton?: boolean;
  skeletonClassName?: string;
}

export function PermissionGuard({
  permission,
  children,
  fallback = null,
  showSkeleton = true,
  skeletonClassName,
}: PermissionGuardProps) {
  const { data: hasPermission, isLoading } = usePermission(permission);

  if (isLoading && showSkeleton) {
    return <Skeleton className={skeletonClassName ?? "h-10 w-full"} />;
  }

  if (isLoading && !showSkeleton) return null;
  if (!hasPermission) return <>{fallback}</>;
  return <>{children}</>;
}
