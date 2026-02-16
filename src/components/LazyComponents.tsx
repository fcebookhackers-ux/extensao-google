import { lazy, Suspense, type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

// Lazy load de componentes pesados
export const AutomationEditor = lazy(() => import("@/pages/dashboard/automacoes/Editor"));

export const AnalyticsDashboard = lazy(() => import("@/pages/Analytics"));

// VersionHistory é um named export, então mapeamos para default
export const VersionHistory = lazy(async () => {
  const mod = await import("@/components/automation/VersionHistory");
  return { default: mod.VersionHistory };
});

interface LazyLoadProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function LazyLoad({ children, fallback }: LazyLoadProps) {
  return (
    <Suspense
      fallback={
        fallback || (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )
      }
    >
      {children}
    </Suspense>
  );
}
