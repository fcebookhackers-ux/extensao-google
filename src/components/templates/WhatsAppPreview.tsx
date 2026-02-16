import * as React from "react";
import { Check } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function WhatsAppPreview({
  message,
  contactName = "João da Silva",
}: {
  message: string;
  contactName?: string;
}) {
  const time = React.useMemo(
    () =>
      new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{contactName}</p>
          <p className="text-xs text-muted-foreground">online</p>
        </div>
      </div>

      {/* Chat */}
      <CardContent className={cn("space-y-3 bg-muted/10 p-4")}> 
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-lg border bg-background p-3 shadow-sm">
            <p className="whitespace-pre-wrap text-sm">{message || "—"}</p>
            <div className="mt-1 flex items-center justify-end gap-1">
              <span className="text-[11px] text-muted-foreground">{time}</span>
              <Check className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
