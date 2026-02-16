import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Wrench } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TimelineEvent = {
  id: string;
  occurredAt: string;
  title: string;
  description: string;
  kind: "maintenance" | "event";
};

function formatTs(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export function HealthTimeline() {
  const query = useQuery({
    queryKey: ["system-health", "timeline"],
    queryFn: async () => {
      // Fonte 1: execuções de limpeza/retention (maintenance)
      const cleanup = await supabase
        .from("cleanup_metrics")
        .select("id, run_at, status, freed_bytes, error_message")
        .order("run_at", { ascending: false })
        .limit(10);

      if (cleanup.error) throw cleanup.error;

      const maintenance: TimelineEvent[] = (cleanup.data ?? []).map((row: any) => ({
        id: `cleanup:${row.id}`,
        occurredAt: row.run_at,
        title: row.status === "success" ? "Limpeza automática concluída" : "Limpeza automática (falha)",
        description:
          row.status === "success"
            ? `Espaço liberado: ${(Number(row.freed_bytes ?? 0) / (1024 * 1024)).toFixed(1)} MB`
            : row.error_message ?? "Erro não informado",
        kind: "maintenance",
      }));

      return maintenance;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4" />
          Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando timeline…</div>
        ) : query.data?.length ? (
          <ol className="relative space-y-4 border-l pl-4">
            {query.data.map((ev) => (
              <li key={ev.id} className="relative">
                <span
                  className={cn(
                    "absolute -left-[9px] top-1.5 grid h-4 w-4 place-items-center rounded-full border bg-background",
                  )}
                >
                  <Wrench className="h-3 w-3 text-muted-foreground" />
                </span>
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">{ev.title}</div>
                  <div className="text-xs text-muted-foreground">{formatTs(ev.occurredAt)}</div>
                  <div className="text-sm text-muted-foreground">{ev.description}</div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="text-sm text-muted-foreground">Sem eventos recentes.</div>
        )}
      </CardContent>
    </Card>
  );
}
