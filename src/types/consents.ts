export type UserConsentType = "analytics" | "marketing" | "third_party" | "essential";

export interface UserConsentRecord {
  id: string;
  user_id: string;
  consent_type: Exclude<UserConsentType, "essential">;
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export type UserConsentState = Record<UserConsentType, boolean>;
