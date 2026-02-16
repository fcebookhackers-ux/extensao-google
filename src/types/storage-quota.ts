export interface StorageQuota {
  id: string;
  user_id: string;
  total_size_bytes: number;
  max_size_bytes: number;
  file_count: number;
  max_file_count: number;
  created_at: string;
  updated_at: string;
}

export interface QuotaUsage {
  used: number;
  max: number;
  percentage: number;
  remaining: number;
}
