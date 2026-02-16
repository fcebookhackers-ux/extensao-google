import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LargestFile, MediaAnalyticsSummary, MediaUploadTrend, TopTag } from "@/types/media-analytics";

type RpcMediaAnalytics = {
  total_files: number;
  total_size_bytes: number;
  compressed_files: number;
  total_savings_bytes: number;
  quota: {
    used_bytes: number;
    max_bytes: number;
    used_percentage: number;
    file_count: number;
    max_file_count: number;
  };
  by_type: {
    image: { count: number; size_bytes: number };
    video: { count: number; size_bytes: number };
    document: { count: number; size_bytes: number };
    audio: { count: number; size_bytes: number };
  };
  first_upload_at: string | null;
  last_upload_at: string | null;
};

function mapSummary(data: RpcMediaAnalytics): MediaAnalyticsSummary {
  return {
    totalFiles: data.total_files,
    totalSizeBytes: data.total_size_bytes,
    compressedFiles: data.compressed_files,
    totalSavingsBytes: data.total_savings_bytes,
    quota: {
      usedBytes: data.quota.used_bytes,
      maxBytes: data.quota.max_bytes,
      usedPercentage: data.quota.used_percentage,
      fileCount: data.quota.file_count,
      maxFileCount: data.quota.max_file_count,
    },
    byType: {
      image: { count: data.by_type.image.count, sizeBytes: data.by_type.image.size_bytes },
      video: { count: data.by_type.video.count, sizeBytes: data.by_type.video.size_bytes },
      document: { count: data.by_type.document.count, sizeBytes: data.by_type.document.size_bytes },
      audio: { count: data.by_type.audio.count, sizeBytes: data.by_type.audio.size_bytes },
    },
    firstUploadAt: data.first_upload_at,
    lastUploadAt: data.last_upload_at,
  };
}

export function useMediaAnalyticsSummary() {
  return useQuery({
    queryKey: ["media-analytics-summary"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("get_media_analytics");
      if (error) throw error;
      return mapSummary(data as RpcMediaAnalytics);
    },
    refetchInterval: 60_000,
  });
}

export function useMediaUploadTrend(days = 30) {
  return useQuery({
    queryKey: ["media-upload-trend", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_media_upload_trend", { p_days: days });
      if (error) throw error;

      return (data ?? []).map((row: any) =>
        ({
          uploadDate: row.upload_date,
          fileCount: Number(row.file_count ?? 0),
          totalSizeBytes: Number(row.total_size_bytes ?? 0),
          images: Number(row.images ?? 0),
          videos: Number(row.videos ?? 0),
          documents: Number(row.documents ?? 0),
          audio: Number(row.audio ?? 0),
        }) satisfies MediaUploadTrend,
      );
    },
  });
}

export function useTopTags(limit = 10) {
  return useQuery({
    queryKey: ["media-top-tags", limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_media_top_tags", { p_limit: limit });
      if (error) throw error;
      return (data ?? []).map((row: any) =>
        ({
          tagId: row.tag_id,
          tagName: row.tag_name,
          color: row.color,
          usageCount: Number(row.usage_count ?? 0),
          totalSizeBytes: Number(row.total_size_bytes ?? 0),
        }) satisfies TopTag,
      );
    },
  });
}

export function useLargestFiles(limit = 10) {
  return useQuery({
    queryKey: ["media-largest-files", limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_media_largest_files", { p_limit: limit });
      if (error) throw error;

      return (data ?? []).map((row: any) =>
        ({
          id: row.id,
          fileName: row.file_name,
          fileType: row.file_type,
          fileSize: Number(row.file_size ?? 0),
          mimeType: row.mime_type,
          createdAt: row.created_at,
          folderId: row.folder_id,
        }) satisfies LargestFile,
      );
    },
  });
}
