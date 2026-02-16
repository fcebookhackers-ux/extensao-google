import * as React from "react";
import { Loader2 } from "lucide-react";

export function SpinnerMessage({ message }: { message: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
