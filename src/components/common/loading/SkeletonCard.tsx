import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="mt-4 h-4 w-3/4" />
        <Skeleton className="mt-2 h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}
