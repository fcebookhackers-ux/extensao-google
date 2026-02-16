import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SLIMetricRow = {
  id: string;
  domain: string;
  metric_name: string;
  value: number;
  target: number;
  window_start: string;
  window_end: string;
  created_at: string;
};

export function useSLIMetrics(days = 7) {
  return useQuery({
    queryKey: ["sli-metrics", days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // Note: a tabela foi adicionada recentemente; para evitar bloqueio por tipos gerados,
      // usamos um cast leve.
      const { data, error } = await (supabase as any)
        .from("sli_metrics")
        .select("id,domain,metric_name,value,target,window_start,window_end,created_at")
        .gte("window_start", since)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;
      return (data ?? []) as SLIMetricRow[];
    },
    refetchInterval: 60_000,
  });
}
