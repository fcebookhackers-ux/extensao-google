export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset_at: string;
}

export interface RateLimitConfig {
  endpoint: string;
  max_requests: number;
  window_seconds: number;
  description?: string;
}

export type RateLimitEndpoint =
  | "auth.login"
  | "auth.signup"
  | "auth.password_reset"
  | "contacts.import"
  | "contacts.export"
  | "automations.publish"
  | "team.invite"
  | "webhook.trigger"
  | "api.general";

export class RateLimitError extends Error {
  constructor(
    message: string,
    public resetAt: Date,
    public remaining: number = 0,
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}
