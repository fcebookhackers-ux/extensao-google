import { Skeleton as UiSkeleton } from "@/components/ui/skeleton";
import type * as React from "react";

export function Skeleton(props: React.HTMLAttributes<HTMLDivElement>) {
  return <UiSkeleton {...props} />;
}
