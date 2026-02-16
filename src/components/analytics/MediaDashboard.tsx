import * as React from "react";
import { Archive, HardDrive, Tag as TagIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLargestFiles, useMediaAnalyticsSummary, useMediaUploadTrend, useTopTags } from "@/hooks/useMediaAnalytics";
import { formatBytes } from "@/lib/format";
import { StorageQuotaChart } from "@/components/analytics/media/StorageQuotaChart";
import { TypeDistributionChart } from "@/components/analytics/media/TypeDistributionChart";
import { UploadTrendChart } from "@/components/analytics/media/UploadTrendChart";

function hexToHslString(hex: string) {
  const normalized = hex.trim().replace("#", "");
  if (![3, 6].includes(normalized.length)) return "hsl(var(--muted-foreground))";

  const full = normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
        break;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  return `hsl(${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}

export function MediaDashboard() {
  const summaryQuery = useMediaAnalyticsSummary();
  const trendQuery = useMediaUploadTrend(30);
  const tagsQuery = useTopTags(5);
  const largestQuery = useLargestFiles(10);

  const recentUploads = React.useMemo(() => {
    const rows = trendQuery.data ?? [];
    const last7 = rows.slice(Math.max(0, rows.length - 7));
    return last7.reduce((sum, d) => sum + d.fileCount, 0);
  }, [trendQuery.data]);

  if (summaryQuery.isLoading || !summaryQuery.data) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[320px] lg:col-span-2" />
        <Skeleton className="h-[320px]" />
      </div>
    );
  }

  const summary = summaryQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Analytics de Mídia</h2>
        <p className="mt-1 text-sm text-muted-foreground">Uso de storage, tendências de upload e distribuição por tipo.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de arquivos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold tabular-nums">{summary.totalFiles.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">{formatBytes(summary.totalSizeBytes)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <HardDrive className="h-4 w-4 text-primary" />
              Storage usado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold tabular-nums">{summary.quota.usedPercentage.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">
              {formatBytes(summary.quota.usedBytes)} de {formatBytes(summary.quota.maxBytes)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Economia (compressão)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold tabular-nums">{formatBytes(summary.totalSavingsBytes)}</div>
            <div className="text-xs text-muted-foreground">{summary.compressedFiles.toLocaleString()} arquivos comprimidos</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Atividade recente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold tabular-nums">{recentUploads.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">uploads nos últimos 7 dias</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uso de storage</CardTitle>
          </CardHeader>
          <CardContent>
            <StorageQuotaChart usedBytes={summary.quota.usedBytes} maxBytes={summary.quota.maxBytes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <TypeDistributionChart byType={summary.byType} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tendência de uploads (30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          {trendQuery.data ? <UploadTrendChart trend={trendQuery.data} /> : <Skeleton className="h-[260px]" />}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TagIcon className="h-4 w-4 text-primary" />
              Tags mais usadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(tagsQuery.data ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma tag criada ainda.</div>
            ) : (
              (tagsQuery.data ?? []).map((tag) => (
                <div key={tag.tagId} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: hexToHslString(tag.color) }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{tag.tagName}</div>
                      <div className="text-xs text-muted-foreground">
                        {tag.usageCount} arquivo{tag.usageCount !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{formatBytes(tag.totalSizeBytes)}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Archive className="h-4 w-4 text-primary" />
              Maiores arquivos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(largestQuery.data ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum arquivo encontrado.</div>
            ) : (
              (largestQuery.data ?? []).map((file) => (
                <div key={file.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{file.fileName}</div>
                    <div className="text-xs text-muted-foreground">{file.fileType}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{formatBytes(file.fileSize)}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
