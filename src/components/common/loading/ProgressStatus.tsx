import * as React from "react";
import { Progress } from "@/components/ui/progress";

export function ProgressStatus({
  progress,
  label,
  current,
  total,
}: {
  progress: number;
  label: string;
  current?: number;
  total?: number;
}) {
  return (
    <div className="space-y-2">
      <Progress value={progress} />
      <p className="text-center text-sm text-muted-foreground">
        {Math.round(progress)}% - {label}
        {typeof current === "number" && typeof total === "number" ? ` (${current}/${total})` : ""}
      </p>
    </div>
  );
}
