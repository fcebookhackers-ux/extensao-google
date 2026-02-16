import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type SignedUrlResponse =
  | { ok: true; signedUrl: string; ttlSeconds: number; cached?: boolean }
  | { ok: false; error: string };

type SignedUrlBatchResponse =
  | {
      ok: true;
      ttlSeconds: number;
      urls: Record<string, string>;
      errors?: Record<string, string>;
    }
  | { ok: false; error: string };

export async function getSignedUrl(filePath: string, ttlSeconds = 3600) {
  const { data, error } = await supabase.functions.invoke("get-signed-url", {
    body: { filePath, ttlSeconds },
  });
  if (error) throw error;
  const payload = data as SignedUrlResponse;
  if (!payload?.ok) throw new Error((payload as any)?.error || "Falha ao obter signed URL");
  return payload.signedUrl;
}

export async function getBatchSignedUrls(filePaths: string[], ttlSeconds = 3600) {
  const { data, error } = await supabase.functions.invoke("get-signed-url", {
    body: { filePaths, ttlSeconds },
  });
  if (error) throw error;
  const payload = data as SignedUrlBatchResponse;
  if (!payload?.ok) throw new Error((payload as any)?.error || "Falha ao obter signed URLs");
  return payload;
}

export function useSignedUrl(filePath: string | null | undefined, opts?: { ttlSeconds?: number }) {
  const ttlSeconds = opts?.ttlSeconds ?? 3600;

  return useQuery({
    queryKey: ["signed-url", filePath, ttlSeconds],
    enabled: !!filePath,
    queryFn: async () => {
      return await getSignedUrl(String(filePath), ttlSeconds);
    },
    staleTime: 1000 * 60 * 50, // 50 min
    gcTime: 1000 * 60 * 60, // 1h
  });
}

/**
 * Alternativa segura ao "Promise.all(filePaths.map(() => useSignedUrl()))":
 * aqui fazemos UMA chamada batch para a Edge Function.
 */
export function useSignedUrls(filePaths: string[], opts?: { ttlSeconds?: number }) {
  const ttlSeconds = opts?.ttlSeconds ?? 3600;
  const key = useMemo(() => filePaths.slice().sort().join("|"), [filePaths]);

  return useQuery({
    queryKey: ["signed-urls", key, ttlSeconds],
    enabled: filePaths.length > 0,
    queryFn: async () => {
      const res = await getBatchSignedUrls(filePaths, ttlSeconds);
      return res;
    },
    staleTime: 1000 * 60 * 50,
    gcTime: 1000 * 60 * 60,
  });
}
