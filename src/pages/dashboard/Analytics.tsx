import * as React from "react";
import { BarChart3 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FunnelChart } from "@/components/analytics/FunnelChart";
import { ConversionFunnelsCard } from "@/components/analytics/ConversionFunnelsCard";
import { MetricsOverview } from "@/components/analytics/MetricsOverview";
import { AutomationPerformance } from "@/components/analytics/AutomationPerformance";
import { MediaDashboard } from "@/components/analytics/MediaDashboard";
import { WebhookDashboard } from "@/components/analytics/WebhookDashboard";
import { useAutomations } from "@/hooks/useAutomations";
import { usePrefetchRelated } from "@/hooks/usePrefetch";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardAnalytics() {
  const [tab, setTab] = React.useState("overview");
  const automationsQuery = useAutomations();

  const queryClient = useQueryClient();
  const { prefetchAutomationDetails } = usePrefetchRelated();

  // Prefetch leve para tornar a troca de abas (Media/Webhooks) mais imediata.
  React.useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: ["media-analytics-summary"],
      queryFn: async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const { data, error } = await supabase.rpc("get_media_analytics");
        if (error) throw error;

        const raw: any = data;
        return {
          totalFiles: Number(raw.total_files ?? 0),
          totalSizeBytes: Number(raw.total_size_bytes ?? 0),
          compressedFiles: Number(raw.compressed_files ?? 0),
          totalSavingsBytes: Number(raw.total_savings_bytes ?? 0),
          quota: {
            usedBytes: Number(raw.quota?.used_bytes ?? 0),
            maxBytes: Number(raw.quota?.max_bytes ?? 0),
            usedPercentage: Number(raw.quota?.used_percentage ?? 0),
            fileCount: Number(raw.quota?.file_count ?? 0),
            maxFileCount: Number(raw.quota?.max_file_count ?? 0),
          },
          byType: {
            image: {
              count: Number(raw.by_type?.image?.count ?? 0),
              sizeBytes: Number(raw.by_type?.image?.size_bytes ?? 0),
            },
            video: {
              count: Number(raw.by_type?.video?.count ?? 0),
              sizeBytes: Number(raw.by_type?.video?.size_bytes ?? 0),
            },
            document: {
              count: Number(raw.by_type?.document?.count ?? 0),
              sizeBytes: Number(raw.by_type?.document?.size_bytes ?? 0),
            },
            audio: {
              count: Number(raw.by_type?.audio?.count ?? 0),
              sizeBytes: Number(raw.by_type?.audio?.size_bytes ?? 0),
            },
          },
          firstUploadAt: raw.first_upload_at ?? null,
          lastUploadAt: raw.last_upload_at ?? null,
        };
      },
      staleTime: 60_000,
    });

    void queryClient.prefetchQuery({
      queryKey: ["global-webhook-analytics"],
      queryFn: async () => {
        const { data, error } = await supabase.rpc("get_global_webhook_analytics");
        if (error) throw error;

        const raw: any = data;
        return {
          totalWebhooks: Number(raw.total_webhooks ?? 0),
          activeWebhooks: Number(raw.active_webhooks ?? 0),
          totalDeliveries: Number(raw.total_deliveries ?? 0),
          successfulDeliveries: Number(raw.successful_deliveries ?? 0),
          failedDeliveries: Number(raw.failed_deliveries ?? 0),
          successRate: Number(raw.success_rate ?? 0),
          avgResponseTimeMs: Number(raw.avg_response_time_ms ?? 0),
        };
      },
      staleTime: 30_000,
    });
  }, [queryClient]);

  // Prefetch leve: detalhes/métricas das 3 primeiras automações exibidas.
  React.useEffect(() => {
    const items = (automationsQuery.data ?? []).slice(0, 3);
    items.forEach((a) => void prefetchAutomationDetails(a.id));
  }, [automationsQuery.data, prefetchAutomationDetails]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <BarChart3 className="h-5 w-5 text-primary" />
            Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Acompanhe o desempenho das suas automações e funil de ativação</p>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="funnels">Funis</TabsTrigger>
          <TabsTrigger value="automations">Automações</TabsTrigger>
          <TabsTrigger value="media">Mídia</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <MetricsOverview />
          <div className="grid gap-4 lg:grid-cols-2">
            <FunnelChart />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top automações (última atividade)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {automationsQuery.isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  (automationsQuery.data ?? []).slice(0, 3).map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{a.name}</div>
                        <div className="text-xs text-muted-foreground">Status: {a.status}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{new Date(a.updated_at).toLocaleDateString()}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="funnels" className="mt-6 space-y-6">
          <ConversionFunnelsCard />
        </TabsContent>

        <TabsContent value="automations" className="mt-6 space-y-6">
          {automationsQuery.isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-[320px] w-full" />
              <Skeleton className="h-[320px] w-full" />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {(automationsQuery.data ?? []).slice(0, 4).map((a) => (
                <div key={a.id} className="space-y-2">
                  <div className="text-sm font-medium">{a.name}</div>
                  <AutomationPerformance automationId={a.id} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="media" className="mt-6 space-y-6">
          <MediaDashboard />
        </TabsContent>

        <TabsContent value="webhooks" className="mt-6 space-y-6">
          <WebhookDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
