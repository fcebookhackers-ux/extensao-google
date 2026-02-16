export type CircuitBreakerState = 'closed' | 'open' | 'half_open';

export interface CircuitBreaker {
  id: string;
  webhook_id: string;
  state: CircuitBreakerState;
  failure_count: number;
  success_count: number;
  last_failure_at: string | null;
  last_success_at: string | null;
  opened_at: string | null;
  half_opened_at: string | null;
  consecutive_failures: number;
  consecutive_successes: number;
  created_at: string;
  updated_at: string;
}

export interface CircuitBreakerStatus {
  can_execute: boolean;
  state: CircuitBreakerState;
  reason: string | null;
}

export interface CircuitBreakerConfig {
  id: string;
  failure_threshold: number;
  success_threshold: number;
  open_timeout_seconds: number;
  half_open_max_calls: number;
  created_at: string;
}
