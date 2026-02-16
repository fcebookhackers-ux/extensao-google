export type ExportStatus = "pending" | "processing" | "completed" | "failed" | "expired";

export type DeletionStatus = "pending" | "scheduled" | "processing" | "completed" | "cancelled";

export interface DataExportRequest {
  id: string;
  user_id: string;
  requested_at: string;
  completed_at: string | null;
  expires_at: string | null;
  download_url: string | null;
  file_size_bytes: number | null;
  status: ExportStatus;
  error_message: string | null;
  metadata: Record<string, any>;
}

export interface DataDeletionRequest {
  id: string;
  user_id: string;
  requested_at: string;
  scheduled_for: string;
  completed_at: string | null;
  cancelled_at: string | null;
  status: DeletionStatus;
  reason: string | null;
  backup_location: string | null;
  metadata: Record<string, any>;
}

export interface ConsentRecord {
  id: string;
  user_id: string;
  consent_type: string;
  policy_version: string;
  granted: boolean;
  granted_at: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, any>;
}

export type ConsentType =
  | "terms_of_service"
  | "privacy_policy"
  | "cookie_policy"
  | "marketing_emails"
  | "data_processing";

export interface PolicyVersion {
  id: string;
  policy_type: string;
  version: string;
  content: string;
  effective_from: string;
  created_at: string;
}
