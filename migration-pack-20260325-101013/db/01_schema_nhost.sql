


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;














CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';















CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";












CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'moderator',
    'user'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."automation_status" AS ENUM (
    'draft',
    'active',
    'paused'
);


ALTER TYPE "public"."automation_status" OWNER TO "postgres";


CREATE TYPE "public"."circuit_breaker_state" AS ENUM (
    'closed',
    'open',
    'half_open'
);


ALTER TYPE "public"."circuit_breaker_state" OWNER TO "postgres";


CREATE TYPE "public"."cloud_provider" AS ENUM (
    'google_drive',
    'dropbox',
    'onedrive'
);


ALTER TYPE "public"."cloud_provider" OWNER TO "postgres";


CREATE TYPE "public"."export_format" AS ENUM (
    'csv',
    'json',
    'pdf',
    'xlsx'
);


ALTER TYPE "public"."export_format" OWNER TO "postgres";


CREATE TYPE "public"."export_status" AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);


ALTER TYPE "public"."export_status" OWNER TO "postgres";


CREATE TYPE "public"."flow_var_type" AS ENUM (
    'text',
    'number',
    'date',
    'boolean'
);


ALTER TYPE "public"."flow_var_type" OWNER TO "postgres";


CREATE TYPE "public"."notification_priority" AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


ALTER TYPE "public"."notification_priority" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'webhook_failure',
    'webhook_circuit_open',
    'storage_quota_warning',
    'storage_quota_critical',
    'media_processing_complete',
    'media_processing_failed',
    'system_announcement',
    'security_alert'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."permission_type" AS ENUM (
    'automations.create',
    'automations.edit',
    'automations.delete',
    'automations.publish',
    'contacts.import',
    'contacts.export',
    'contacts.delete',
    'team.invite',
    'team.remove',
    'billing.manage',
    'billing.view',
    'analytics.view',
    'settings.manage',
    'whatsapp.manage'
);


ALTER TYPE "public"."permission_type" OWNER TO "postgres";


CREATE TYPE "public"."retention_deletion_strategy" AS ENUM (
    'hard_delete',
    'soft_delete',
    'anonymize'
);


ALTER TYPE "public"."retention_deletion_strategy" OWNER TO "postgres";


CREATE TYPE "public"."retention_entity_type" AS ENUM (
    'data_exports',
    'webhook_logs',
    'rate_limit_events',
    'audit_events',
    'analytics_events'
);


ALTER TYPE "public"."retention_entity_type" OWNER TO "postgres";


CREATE TYPE "public"."retry_status" AS ENUM (
    'pending',
    'processing',
    'succeeded',
    'failed',
    'exhausted'
);


ALTER TYPE "public"."retry_status" OWNER TO "postgres";


CREATE TYPE "public"."sync_status" AS ENUM (
    'idle',
    'syncing',
    'completed',
    'failed'
);


ALTER TYPE "public"."sync_status" OWNER TO "postgres";


CREATE TYPE "public"."webhook_provider" AS ENUM (
    'zapier',
    'make',
    'n8n',
    'discord',
    'slack',
    'webhook_site',
    'custom'
);


ALTER TYPE "public"."webhook_provider" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_tag_to_media"("p_media_id" "uuid", "p_tag_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Ensure user owns the media, and tag belongs to the user
  IF NOT EXISTS (
    SELECT 1
    FROM public.media_library ml
    JOIN public.media_tags t ON t.id = p_tag_id
    WHERE ml.id = p_media_id
      AND ml.user_id = auth.uid()
      AND t.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem permissão para vincular tag';
  END IF;

  INSERT INTO public.media_tag_assignments (media_id, tag_id)
  VALUES (p_media_id, p_tag_id)
  ON CONFLICT (media_id, tag_id) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."add_tag_to_media"("p_media_id" "uuid", "p_tag_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_notification"("p_notification_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.notifications
  SET archived = true,
      archived_at = now()
  WHERE id = p_notification_id
    AND user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."archive_notification"("p_notification_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_automation_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      'automation.created',
      'automation',
      NEW.id,
      jsonb_build_object('name', NEW.name)
    );

  ELSIF TG_OP = 'UPDATE' THEN
    -- Audita mudança de status
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM public.log_audit_event(
        'automation.status_changed',
        'automation',
        NEW.id,
        jsonb_build_object(
          'old_status', OLD.status,
          'new_status', NEW.status
        )
      );
    END IF;

    -- Audita renomeação (opcional, porém útil)
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      PERFORM public.log_audit_event(
        'automation.updated',
        'automation',
        NEW.id,
        jsonb_build_object(
          'field', 'name',
          'old', OLD.name,
          'new', NEW.name
        )
      );
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      'automation.deleted',
      'automation',
      OLD.id,
      jsonb_build_object('name', OLD.name)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."audit_automation_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_create_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF OLD.doc IS DISTINCT FROM NEW.doc THEN
    PERFORM public.create_automation_version(
      NEW.id,
      NEW.doc,
      'Auto-save'
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_create_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."block_immutable_audit_log_mutations"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'immutable_audit_log is append-only (UPDATE blocked)';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'immutable_audit_log is append-only (DELETE blocked)';
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."block_immutable_audit_log_mutations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_next_retry"("p_attempt_number" integer, "p_initial_delay" integer, "p_max_delay" integer, "p_multiplier" numeric) RETURNS timestamp with time zone
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_delay NUMERIC;
  v_jitter NUMERIC;
  v_final_delay NUMERIC;
BEGIN
  IF p_attempt_number < 1 THEN
    p_attempt_number := 1;
  END IF;

  v_delay := LEAST(
    (p_initial_delay::numeric * POWER(p_multiplier::numeric, (p_attempt_number - 1))::numeric),
    p_max_delay::numeric
  );

  -- jitter ±20%
  v_jitter := (RANDOM() * 0.4 - 0.2) * v_delay;
  v_final_delay := GREATEST(0, v_delay + v_jitter);

  RETURN NOW() + make_interval(secs => v_final_delay);
END;
$$;


ALTER FUNCTION "public"."calculate_next_retry"("p_attempt_number" integer, "p_initial_delay" integer, "p_max_delay" integer, "p_multiplier" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_sli_automations"("p_window_hours" integer DEFAULT 24) RETURNS TABLE("success_rate" numeric, "p95_latency" numeric, "total_events" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'success')::NUMERIC /
       NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS success_rate,
    COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 0) AS p95_latency,
    COUNT(*) AS total_events
  FROM public.automation_execution_events
  WHERE created_at > now() - (p_window_hours * INTERVAL '1 hour');
END;
$$;


ALTER FUNCTION "public"."calculate_sli_automations"("p_window_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_sli_sync"("p_window_hours" integer DEFAULT 24) RETURNS TABLE("success_rate" numeric, "p95_latency" numeric, "total_events" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'success')::NUMERIC /
       NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS success_rate,
    COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 0) AS p95_latency,
    COUNT(*) AS total_events
  FROM public.sync_events
  WHERE created_at > now() - (p_window_hours * INTERVAL '1 hour');
END;
$$;


ALTER FUNCTION "public"."calculate_sli_sync"("p_window_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_sli_uploads"("p_window_hours" integer DEFAULT 24) RETURNS TABLE("success_rate" numeric, "p95_validation_time" numeric, "total_events" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'success')::NUMERIC /
       NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS success_rate,
    COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY validation_duration_ms), 0) AS p95_validation_time,
    COUNT(*) AS total_events
  FROM public.upload_events
  WHERE created_at > now() - (p_window_hours * INTERVAL '1 hour');
END;
$$;


ALTER FUNCTION "public"."calculate_sli_uploads"("p_window_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_sli_webhooks"("p_window_hours" integer DEFAULT 24) RETURNS TABLE("success_rate" numeric, "p95_latency" numeric, "total_executions" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(
      (COUNT(*) FILTER (WHERE success = true)::NUMERIC /
       NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS success_rate,
    COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 0) AS p95_latency,
    COUNT(*) AS total_executions
  FROM public.webhook_logs
  WHERE executed_at > now() - (p_window_hours * INTERVAL '1 hour');
END;
$$;


ALTER FUNCTION "public"."calculate_sli_webhooks"("p_window_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_whatsapp_health_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.response_rate := CASE 
    WHEN NEW.messages_sent > 0 THEN 
      (NEW.responses_received::DECIMAL / NEW.messages_sent::DECIMAL * 100)
    ELSE 0 
  END;
  
  NEW.block_rate := CASE 
    WHEN NEW.messages_sent > 0 THEN 
      (NEW.blocks_reported::DECIMAL / NEW.messages_sent::DECIMAL * 100)
    ELSE 0 
  END;
  
  NEW.opt_out_rate := CASE 
    WHEN NEW.messages_sent > 0 THEN 
      (NEW.opt_outs::DECIMAL / NEW.messages_sent::DECIMAL * 100)
    ELSE 0 
  END;
  
  NEW.health_status := CASE
    WHEN NEW.block_rate > 5 OR NEW.response_rate < 20 THEN 'critical'
    WHEN NEW.block_rate > 3 OR NEW.response_rate < 30 THEN 'warning'
    WHEN NEW.response_rate > 50 AND NEW.block_rate < 1 THEN 'excellent'
    ELSE 'good'
  END;
  
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_whatsapp_health_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_execute_webhook"("p_webhook_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_breaker RECORD;
  v_config RECORD;
BEGIN
  -- Buscar ou criar circuit breaker para o webhook
  INSERT INTO public.webhook_circuit_breaker (webhook_id)
  VALUES (p_webhook_id)
  ON CONFLICT (webhook_id) DO NOTHING;

  SELECT * INTO v_breaker
  FROM public.webhook_circuit_breaker
  WHERE webhook_id = p_webhook_id;

  SELECT * INTO v_config
  FROM public.circuit_breaker_config
  LIMIT 1;

  -- CLOSED: pode executar normalmente
  IF v_breaker.state = 'closed' THEN
    RETURN jsonb_build_object(
      'can_execute', true,
      'state', 'closed',
      'reason', null
    );
  END IF;

  -- OPEN: verificar se já passou o timeout para tentar half_open
  IF v_breaker.state = 'open' THEN
    IF NOW() - v_breaker.opened_at > INTERVAL '1 second' * v_config.open_timeout_seconds THEN
      -- Transição para HALF_OPEN
      UPDATE public.webhook_circuit_breaker
      SET 
        state = 'half_open',
        half_opened_at = NOW(),
        consecutive_successes = 0
      WHERE webhook_id = p_webhook_id;

      RETURN jsonb_build_object(
        'can_execute', true,
        'state', 'half_open',
        'reason', 'Transitioning to half-open state for testing'
      );
    ELSE
      RETURN jsonb_build_object(
        'can_execute', false,
        'state', 'open',
        'reason', 'Circuit breaker is OPEN due to too many failures'
      );
    END IF;
  END IF;

  -- HALF_OPEN: permitir tentativas limitadas
  IF v_breaker.state = 'half_open' THEN
    IF v_breaker.consecutive_successes < v_config.half_open_max_calls THEN
      RETURN jsonb_build_object(
        'can_execute', true,
        'state', 'half_open',
        'reason', 'Testing in half-open state'
      );
    ELSE
      RETURN jsonb_build_object(
        'can_execute', false,
        'state', 'half_open',
        'reason', 'Maximum test calls reached in half-open state'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('can_execute', false, 'state', 'unknown', 'reason', 'Unknown state');
END;
$$;


ALTER FUNCTION "public"."can_execute_webhook"("p_webhook_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_account_deletion"("p_request_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.data_deletion_requests
  SET status = 'cancelled',
      cancelled_at = NOW()
  WHERE id = p_request_id
    AND user_id = auth.uid()
    AND status = 'scheduled';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada ou já processada';
  END IF;

  PERFORM public.log_audit_event(
    'data.deletion_cancelled',
    'deletion',
    p_request_id
  );
END;
$$;


ALTER FUNCTION "public"."cancel_account_deletion"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_permission"("required_permission" "public"."permission_type") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp
      ON rp.role = ur.role
    WHERE ur.user_id = auth.uid()
      AND rp.permission = required_permission
  );
$$;


ALTER FUNCTION "public"."check_permission"("required_permission" "public"."permission_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("p_endpoint" "text", "p_custom_max_requests" integer DEFAULT NULL::integer, "p_custom_window_seconds" integer DEFAULT NULL::integer) RETURNS TABLE("allowed" boolean, "remaining" integer, "reset_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_max_requests INT;
  v_window_seconds INT;
  v_window_start TIMESTAMPTZ;
  v_request_count INT;
  v_user_id UUID;
  v_ip_address INET;
BEGIN
  -- Load config unless both custom limits are provided
  IF p_custom_max_requests IS NULL OR p_custom_window_seconds IS NULL THEN
    SELECT max_requests, window_seconds
      INTO v_max_requests, v_window_seconds
    FROM public.rate_limit_config
    WHERE endpoint = p_endpoint;

    IF v_max_requests IS NULL THEN
      v_max_requests := COALESCE(p_custom_max_requests, 100);
      v_window_seconds := COALESCE(p_custom_window_seconds, 3600);
    END IF;
  ELSE
    v_max_requests := p_custom_max_requests;
    v_window_seconds := p_custom_window_seconds;
  END IF;

  v_user_id := auth.uid();
  v_ip_address := inet_client_addr();
  v_window_start := NOW() - (v_window_seconds || ' seconds')::INTERVAL;

  -- If unauthenticated, rate-limit by IP only (best-effort)
  SELECT COUNT(*) INTO v_request_count
  FROM public.rate_limit_events
  WHERE endpoint = p_endpoint
    AND created_at > v_window_start
    AND (
      (v_user_id IS NOT NULL AND user_id = v_user_id)
      OR (v_user_id IS NULL AND ip_address = v_ip_address)
    );

  IF v_request_count >= v_max_requests THEN
    RETURN QUERY SELECT
      FALSE,
      0,
      (v_window_start + (v_window_seconds || ' seconds')::INTERVAL);
    RETURN;
  END IF;

  INSERT INTO public.rate_limit_events (user_id, ip_address, endpoint)
  VALUES (v_user_id, v_ip_address, p_endpoint);

  RETURN QUERY SELECT
    TRUE,
    (v_max_requests - v_request_count - 1),
    (v_window_start + (v_window_seconds || ' seconds')::INTERVAL);
END;
$$;


ALTER FUNCTION "public"."check_rate_limit"("p_endpoint" "text", "p_custom_max_requests" integer, "p_custom_window_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rate_limit_v2"("p_endpoint" "text", "p_limit_type" "text", "p_identifier" "text", "p_tier" "text" DEFAULT 'free'::"text") RETURNS TABLE("allowed" boolean, "remaining" integer, "reset_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_rule public.rate_limit_rules_v2%ROWTYPE;
  v_window_start timestamptz;
  v_current_count integer;
BEGIN
  IF p_limit_type NOT IN ('per_user','per_workspace','per_ip') THEN
    RAISE EXCEPTION 'Invalid limit_type: %', p_limit_type;
  END IF;

  SELECT * INTO v_rule
  FROM public.rate_limit_rules_v2
  WHERE endpoint = p_endpoint
    AND limit_type = p_limit_type
    AND is_active = true
    AND (tier = p_tier OR tier IS NULL)
  ORDER BY (tier IS NULL) ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT true, 999999, now() + interval '1 hour';
    RETURN;
  END IF;

  v_window_start := date_trunc('second', now()) -
    ((extract(epoch from now())::integer % v_rule.window_seconds) * interval '1 second');

  INSERT INTO public.rate_limit_counters_v2 (rule_id, identifier, endpoint, window_start)
  VALUES (v_rule.id, p_identifier, p_endpoint, v_window_start)
  ON CONFLICT (rule_id, identifier, window_start)
  DO UPDATE SET request_count = public.rate_limit_counters_v2.request_count + 1
  RETURNING request_count INTO v_current_count;

  RETURN QUERY
    SELECT
      (v_current_count <= v_rule.max_requests) AS allowed,
      greatest(0, v_rule.max_requests - v_current_count) AS remaining,
      v_window_start + (v_rule.window_seconds * interval '1 second') AS reset_at;
END;
$$;


ALTER FUNCTION "public"."check_rate_limit_v2"("p_endpoint" "text", "p_limit_type" "text", "p_identifier" "text", "p_tier" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_webhook_rate_limit"("p_webhook_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_window TIMESTAMPTZ;
  v_allowed BOOLEAN;
  v_row public.webhook_rate_limit%ROWTYPE;
  v_max_requests INT;
  v_window_seconds INT;
BEGIN
  v_current_window := date_trunc('minute', NOW());
  v_window_seconds := 60;

  -- Load per-webhook max from webhooks table (fallback 30)
  SELECT COALESCE(w.rate_limit_per_minute, 30)
    INTO v_max_requests
  FROM public.webhooks w
  WHERE w.id = p_webhook_id;

  IF v_max_requests IS NULL THEN
    v_max_requests := 30;
  END IF;

  -- Ensure row exists
  INSERT INTO public.webhook_rate_limit (
    webhook_id,
    window_start,
    window_duration_seconds,
    request_count,
    max_requests
  ) VALUES (
    p_webhook_id,
    v_current_window,
    v_window_seconds,
    0,
    v_max_requests
  )
  ON CONFLICT (webhook_id, window_start)
  DO UPDATE SET
    max_requests = EXCLUDED.max_requests;

  SELECT * INTO v_row
  FROM public.webhook_rate_limit
  WHERE webhook_id = p_webhook_id
    AND window_start = v_current_window;

  v_allowed := v_row.request_count < v_row.max_requests;

  IF v_allowed THEN
    UPDATE public.webhook_rate_limit
    SET request_count = request_count + 1
    WHERE webhook_id = p_webhook_id
      AND window_start = v_current_window
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'current_count', v_row.request_count,
    'max_requests', v_row.max_requests,
    'window_start', v_current_window,
    'window_end', v_current_window + INTERVAL '1 minute',
    'retry_after', CASE
      WHEN NOT v_allowed THEN GREATEST(0, EXTRACT(EPOCH FROM (v_current_window + INTERVAL '1 minute' - NOW()))::INTEGER)
      ELSE NULL
    END
  );
END;
$$;


ALTER FUNCTION "public"."check_webhook_rate_limit"("p_webhook_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."webhook_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "webhook_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "retry_count" integer DEFAULT 0 NOT NULL,
    "max_retries" integer DEFAULT 5 NOT NULL,
    "next_retry_at" timestamp with time zone,
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    CONSTRAINT "webhook_jobs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'dead'::"text"])))
);


ALTER TABLE "public"."webhook_jobs" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_webhook_jobs"("p_limit" integer DEFAULT 10) RETURNS SETOF "public"."webhook_jobs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  UPDATE public.webhook_jobs
  SET status = 'processing',
      started_at = COALESCE(started_at, now())
  WHERE id IN (
    SELECT id
    FROM public.webhook_jobs
    WHERE status = 'pending'
      AND (next_retry_at IS NULL OR next_retry_at <= now())
    ORDER BY COALESCE(next_retry_at, created_at) ASC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;


ALTER FUNCTION "public"."claim_webhook_jobs"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_data"() RETURNS TABLE("entity_type" "text", "workspace_id" "uuid", "deleted_count" bigint, "execution_time_ms" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  policy RECORD;
  start_time timestamptz;
  rows_affected bigint;
  cutoff timestamptz;
BEGIN
  FOR policy IN
    SELECT *
    FROM public.data_retention_policies
    WHERE is_global = true OR apply_to_workspace_id IS NOT NULL
  LOOP
    start_time := clock_timestamp();
    cutoff := now() - make_interval(days => policy.retention_days);
    rows_affected := 0;

    -- IMPORTANT: avoid dynamic SQL; explicit cases only.
    IF policy.deletion_strategy <> 'hard_delete' THEN
      -- For now we only execute hard_delete in this function.
      -- soft_delete/anonymize require entity-specific schemas/columns.
      CONTINUE;
    END IF;

    IF policy.entity_type = 'webhook_logs' THEN
      DELETE FROM public.webhook_logs
      WHERE executed_at < cutoff;
      GET DIAGNOSTICS rows_affected = ROW_COUNT;

    ELSIF policy.entity_type = 'rate_limit_events' THEN
      DELETE FROM public.rate_limit_events
      WHERE created_at < cutoff;
      GET DIAGNOSTICS rows_affected = ROW_COUNT;

    ELSIF policy.entity_type = 'audit_events' THEN
      DELETE FROM public.audit_events
      WHERE created_at < cutoff;
      GET DIAGNOSTICS rows_affected = ROW_COUNT;

    ELSIF policy.entity_type = 'analytics_events' THEN
      DELETE FROM public.analytics_events
      WHERE created_at < cutoff;
      GET DIAGNOSTICS rows_affected = ROW_COUNT;

    ELSE
      -- data_exports cleanup is handled in the edge function because it requires Storage removal.
      CONTINUE;
    END IF;

    INSERT INTO public.cleanup_logs (
      entity_type,
      workspace_id,
      policy_id,
      deletion_strategy,
      cutoff_at,
      deleted_count,
      execution_time_ms
    ) VALUES (
      policy.entity_type,
      policy.apply_to_workspace_id,
      policy.id,
      policy.deletion_strategy,
      cutoff,
      rows_affected,
      EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
    );

    entity_type := policy.entity_type::text;
    workspace_id := policy.apply_to_workspace_id;
    deleted_count := rows_affected;
    execution_time_ms := (EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000)::bigint;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_exports"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- MVP: remove only DB rows; file cleanup can be added later.
  DELETE FROM public.export_jobs
  WHERE expires_at IS NOT NULL
    AND expires_at < now();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_exports"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_notifications"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  delete from public.notifications
  where expires_at is not null
    and expires_at < now();
end;
$$;


ALTER FUNCTION "public"."cleanup_expired_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_rate_limit_events"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.rate_limit_events
  WHERE created_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_rate_limit_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_rate_limits"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM public.webhook_rate_limit
  WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_rate_limits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_retries"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.webhook_retry_queue
  WHERE status IN ('succeeded', 'failed', 'exhausted')
    AND updated_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_retries"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_webhook_logs"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.webhook_logs
  WHERE executed_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_webhook_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_onboarding_step"("p_step_id" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  progress_id UUID;
BEGIN
  INSERT INTO public.onboarding_progress (user_id, step_id, metadata)
  VALUES (auth.uid(), p_step_id, COALESCE(p_metadata, '{}'::jsonb))
  ON CONFLICT (user_id, step_id) DO NOTHING
  RETURNING id INTO progress_id;

  RETURN progress_id;
END;
$$;


ALTER FUNCTION "public"."complete_onboarding_step"("p_step_id" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."consume_analysis_quota"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_limit INTEGER;
  v_count INTEGER;
BEGIN
  -- Ensure plan exists
  INSERT INTO public.market_user_plans (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT daily_analysis_limit INTO v_limit
  FROM public.market_user_plans
  WHERE user_id = p_user_id;

  IF v_limit IS NULL THEN
    v_limit := 10;
  END IF;

  INSERT INTO public.market_usage_daily (user_id, day, analyses_count)
  VALUES (p_user_id, current_date, 0)
  ON CONFLICT (user_id, day) DO NOTHING;

  UPDATE public.market_usage_daily
  SET analyses_count = analyses_count + 1,
      updated_at = now()
  WHERE user_id = p_user_id
    AND day = current_date
  RETURNING analyses_count INTO v_count;

  IF v_count > v_limit THEN
    UPDATE public.market_usage_daily
    SET analyses_count = analyses_count - 1,
        updated_at = now()
    WHERE user_id = p_user_id
      AND day = current_date;

    RETURN jsonb_build_object('allowed', false, 'limit', v_limit, 'count', v_count - 1);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'limit', v_limit, 'count', v_count);
END $$;


ALTER FUNCTION "public"."consume_analysis_quota"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."contacts_add_tags"("p_contact_ids" "uuid"[], "p_tags" "text"[]) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.contacts c
  SET tags = (
    SELECT ARRAY(
      SELECT DISTINCT t
      FROM unnest(array_cat(COALESCE(c.tags, '{}'::text[]), COALESCE(p_tags, '{}'::text[]))) AS t
      WHERE t IS NOT NULL AND length(trim(t)) > 0
    )
  )
  WHERE c.user_id = auth.uid()
    AND c.id = ANY(p_contact_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."contacts_add_tags"("p_contact_ids" "uuid"[], "p_tags" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."contacts_change_status"("p_contact_ids" "uuid"[], "p_status" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.contacts c
  SET status = COALESCE(p_status, c.status)
  WHERE c.user_id = auth.uid()
    AND c.id = ANY(p_contact_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."contacts_change_status"("p_contact_ids" "uuid"[], "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."contacts_delete"("p_contact_ids" "uuid"[]) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public.contacts c
  WHERE c.user_id = auth.uid()
    AND c.id = ANY(p_contact_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."contacts_delete"("p_contact_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."contacts_remove_tags"("p_contact_ids" "uuid"[], "p_tags" "text"[]) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.contacts c
  SET tags = (
    SELECT ARRAY(
      SELECT t
      FROM unnest(COALESCE(c.tags, '{}'::text[])) AS t
      WHERE NOT (t = ANY(COALESCE(p_tags, '{}'::text[])))
    )
  )
  WHERE c.user_id = auth.uid()
    AND c.id = ANY(p_contact_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."contacts_remove_tags"("p_contact_ids" "uuid"[], "p_tags" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."contacts_search_vector_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('portuguese', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.phone, '')), 'B') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.email, '')), 'C') ||
    setweight(to_tsvector('portuguese', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."contacts_search_vector_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_automation_version"("p_automation_id" "uuid", "p_doc" "jsonb", "p_change_summary" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_version_number INT;
  v_version_id UUID;
BEGIN
  -- Only owner can create versions for their automations
  IF NOT EXISTS (
    SELECT 1
    FROM public.automations a
    WHERE a.id = p_automation_id
      AND a.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem acesso à automação';
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_version_number
  FROM public.automation_versions
  WHERE automation_id = p_automation_id;

  INSERT INTO public.automation_versions (
    automation_id,
    version_number,
    doc,
    change_summary,
    user_id
  ) VALUES (
    p_automation_id,
    v_version_number,
    p_doc,
    p_change_summary,
    auth.uid()
  ) RETURNING id INTO v_version_id;

  -- Audit (if available)
  PERFORM public.log_audit_event(
    'automation.version_created',
    'automation',
    p_automation_id,
    jsonb_build_object(
      'version_id', v_version_id,
      'version_number', v_version_number,
      'change_summary', p_change_summary
    )
  );

  RETURN v_version_id;
END;
$$;


ALTER FUNCTION "public"."create_automation_version"("p_automation_id" "uuid", "p_doc" "jsonb", "p_change_summary" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_export_job"("p_export_type" "text", "p_format" "public"."export_format", "p_filters" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO public.export_jobs (
    user_id,
    export_type,
    format,
    filters,
    expires_at
  ) VALUES (
    auth.uid(),
    p_export_type,
    p_format,
    p_filters,
    now() + interval '7 days'
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;


ALTER FUNCTION "public"."create_export_job"("p_export_type" "text", "p_format" "public"."export_format", "p_filters" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_priority" "public"."notification_priority" DEFAULT 'medium'::"public"."notification_priority", "p_action_url" "text" DEFAULT NULL::"text", "p_action_label" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT NULL::"jsonb", "p_expires_in_hours" integer DEFAULT NULL::integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_notification_id UUID;
  v_prefs public.notification_preferences%ROWTYPE;
  v_enabled BOOLEAN;
BEGIN
  SELECT * INTO v_prefs
  FROM public.notification_preferences
  WHERE user_id = p_user_id;

  -- If preferences row doesn't exist (edge case), default to enabled.
  IF NOT FOUND THEN
    v_enabled := true;
  ELSE
    v_enabled := CASE p_type
      WHEN 'webhook_failure' THEN v_prefs.webhook_failure_enabled
      WHEN 'webhook_circuit_open' THEN v_prefs.webhook_circuit_open_enabled
      WHEN 'storage_quota_warning' THEN v_prefs.storage_quota_warning_enabled
      WHEN 'storage_quota_critical' THEN v_prefs.storage_quota_critical_enabled
      WHEN 'media_processing_complete' THEN v_prefs.media_processing_complete_enabled
      WHEN 'media_processing_failed' THEN v_prefs.media_processing_failed_enabled
      WHEN 'system_announcement' THEN v_prefs.system_announcement_enabled
      WHEN 'security_alert' THEN v_prefs.security_alert_enabled
      ELSE true
    END;
  END IF;

  IF p_priority = 'critical' OR p_type = 'security_alert' THEN
    v_enabled := true;
  END IF;

  IF NOT v_enabled THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    priority,
    title,
    message,
    action_url,
    action_label,
    metadata,
    expires_at
  ) VALUES (
    p_user_id,
    p_type,
    p_priority,
    p_title,
    p_message,
    p_action_url,
    p_action_label,
    p_metadata,
    CASE
      WHEN p_expires_in_hours IS NOT NULL THEN now() + make_interval(hours => p_expires_in_hours)
      ELSE NULL
    END
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;


ALTER FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_priority" "public"."notification_priority", "p_action_url" "text", "p_action_label" "text", "p_metadata" "jsonb", "p_expires_in_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification_preferences"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_notification_preferences"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_webhook_secret_once"("p_webhook_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_existing record;
  v_secret text;
  v_last4 text;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.webhooks
  WHERE id = p_webhook_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Webhook not found';
  END IF;

  IF v_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT id, secret_last4 INTO v_existing
  FROM public.webhook_secrets
  WHERE webhook_id = p_webhook_id
    AND active = true
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    -- Already created; do not reveal again
    RETURN jsonb_build_object(
      'created', false,
      'secret', null,
      'last4', v_existing.secret_last4
    );
  END IF;

  v_secret := encode(gen_random_bytes(32), 'hex');
  v_last4 := right(v_secret, 4);

  INSERT INTO public.webhook_secrets (
    user_id,
    webhook_id,
    encrypted_value,
    secret_last4,
    rotated_at,
    expires_at,
    grace_expires_at,
    active,
    claimed_at
  ) VALUES (
    v_user_id,
    p_webhook_id,
    public.encrypt_webhook_secret(v_secret),
    v_last4,
    now(),
    now() + interval '90 days',
    now() + interval '97 days',
    true,
    now()
  );

  RETURN jsonb_build_object(
    'created', true,
    'secret', v_secret,
    'last4', v_last4
  );
END;
$$;


ALTER FUNCTION "public"."create_webhook_secret_once"("p_webhook_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrypt_webhook_secret"("p_encrypted_text" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_key bytea;
BEGIN
  -- Only service role may decrypt
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_key := public.get_active_master_key_bytes('webhook_secrets_master');
  RETURN convert_from(decrypt(decode(p_encrypted_text, 'base64'), v_key, 'aes'), 'UTF8');
END;
$$;


ALTER FUNCTION "public"."decrypt_webhook_secret"("p_encrypted_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."encrypt_webhook_secret"("p_secret_text" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_key bytea;
BEGIN
  v_key := public.get_active_master_key_bytes('webhook_secrets_master');
  RETURN encode(encrypt(p_secret_text::bytea, v_key, 'aes'), 'base64');
END;
$$;


ALTER FUNCTION "public"."encrypt_webhook_secret"("p_secret_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_rating_requires_install"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.template_installs i
    WHERE i.template_id = NEW.template_id
      AND i.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'rating_not_allowed: user must install template before rating';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_rating_requires_install"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enqueue_webhook_job"("p_webhook_id" "uuid", "p_event_type" "text", "p_payload" "jsonb", "p_max_retries" integer DEFAULT 5) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_job_id uuid;
BEGIN
  INSERT INTO public.webhook_jobs (
    webhook_id,
    event_type,
    payload,
    status,
    retry_count,
    max_retries,
    next_retry_at
  ) VALUES (
    p_webhook_id,
    p_event_type,
    p_payload,
    'pending',
    0,
    LEAST(GREATEST(COALESCE(p_max_retries, 5), 0), 25),
    now()
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;


ALTER FUNCTION "public"."enqueue_webhook_job"("p_webhook_id" "uuid", "p_event_type" "text", "p_payload" "jsonb", "p_max_retries" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enqueue_webhook_retry"("p_webhook_id" "uuid", "p_webhook_log_id" "uuid", "p_event_type" "text", "p_payload" "jsonb", "p_status_code" integer DEFAULT NULL::integer, "p_error_message" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_config public.webhook_retry_config%ROWTYPE;
  v_should_retry BOOLEAN := FALSE;
  v_retry_id UUID;
  v_next_retry TIMESTAMPTZ;
BEGIN
  -- Ensure config exists (idempotent)
  INSERT INTO public.webhook_retry_config (webhook_id)
  VALUES (p_webhook_id)
  ON CONFLICT (webhook_id) DO NOTHING;

  SELECT * INTO v_config
  FROM public.webhook_retry_config
  WHERE webhook_id = p_webhook_id;

  -- Decide retry
  IF p_status_code IS NULL THEN
    v_should_retry := TRUE; -- network/timeout
  ELSIF p_status_code = ANY(v_config.stop_on_status_codes) THEN
    v_should_retry := FALSE;
  ELSIF p_status_code = ANY(v_config.retry_on_status_codes) THEN
    v_should_retry := TRUE;
  ELSIF p_status_code >= 500 THEN
    v_should_retry := TRUE;
  ELSE
    v_should_retry := FALSE;
  END IF;

  IF NOT v_should_retry THEN
    RETURN NULL;
  END IF;

  v_next_retry := public.calculate_next_retry(
    1,
    v_config.initial_delay_seconds,
    v_config.max_delay_seconds,
    v_config.backoff_multiplier
  );

  INSERT INTO public.webhook_retry_queue (
    webhook_id,
    webhook_log_id,
    event_type,
    payload,
    attempt_number,
    max_attempts,
    status,
    next_retry_at,
    last_error
  ) VALUES (
    p_webhook_id,
    p_webhook_log_id,
    p_event_type,
    p_payload,
    1,
    v_config.max_attempts,
    'pending',
    v_next_retry,
    p_error_message
  )
  RETURNING id INTO v_retry_id;

  RETURN v_retry_id;
END;
$$;


ALTER FUNCTION "public"."enqueue_webhook_retry"("p_webhook_id" "uuid", "p_webhook_log_id" "uuid", "p_event_type" "text", "p_payload" "jsonb", "p_status_code" integer, "p_error_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_primary_workspace_membership"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_primary_workspace_id uuid := 'e3946d71-98ec-4c08-9adb-9b6ed0e28e2d';
BEGIN
  -- Add the user as a member of the primary workspace if not already
  INSERT INTO public.workspace_members (workspace_id, user_id, role, joined_at)
  VALUES (v_primary_workspace_id, NEW.user_id, 'user', now())
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_primary_workspace_membership"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_user_storage_quota"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.user_storage_quotas (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."ensure_user_storage_quota"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."evaluate_webhook_conditions"("p_webhook_id" "uuid", "p_payload" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_condition RECORD;
  v_field_value TEXT;
  v_result BOOLEAN := true;
  v_current_result BOOLEAN;
  v_previous_logic TEXT := 'AND';
BEGIN
  FOR v_condition IN
    SELECT * FROM public.webhook_conditions
    WHERE webhook_id = p_webhook_id
    ORDER BY position
  LOOP
    BEGIN
      v_field_value := p_payload #>> string_to_array(v_condition.field_path, '.');
    EXCEPTION WHEN OTHERS THEN
      v_field_value := NULL;
    END;

    v_current_result := CASE v_condition.operator
      WHEN 'equals' THEN v_field_value = v_condition.value
      WHEN 'not_equals' THEN v_field_value IS DISTINCT FROM v_condition.value
      WHEN 'greater_than' THEN (NULLIF(v_field_value,'')::numeric > NULLIF(v_condition.value,'')::numeric)
      WHEN 'less_than' THEN (NULLIF(v_field_value,'')::numeric < NULLIF(v_condition.value,'')::numeric)
      WHEN 'greater_or_equal' THEN (NULLIF(v_field_value,'')::numeric >= NULLIF(v_condition.value,'')::numeric)
      WHEN 'less_or_equal' THEN (NULLIF(v_field_value,'')::numeric <= NULLIF(v_condition.value,'')::numeric)
      WHEN 'contains' THEN COALESCE(v_field_value,'') LIKE '%' || v_condition.value || '%'
      WHEN 'not_contains' THEN COALESCE(v_field_value,'') NOT LIKE '%' || v_condition.value || '%'
      WHEN 'starts_with' THEN COALESCE(v_field_value,'') LIKE v_condition.value || '%'
      WHEN 'ends_with' THEN COALESCE(v_field_value,'') LIKE '%' || v_condition.value
      WHEN 'matches_regex' THEN COALESCE(v_field_value,'') ~ v_condition.value
      WHEN 'is_empty' THEN v_field_value IS NULL OR v_field_value = ''
      WHEN 'is_not_empty' THEN v_field_value IS NOT NULL AND v_field_value <> ''
      ELSE false
    END;

    IF v_previous_logic = 'AND' THEN
      v_result := v_result AND v_current_result;
    ELSIF v_previous_logic = 'OR' THEN
      v_result := v_result OR v_current_result;
    END IF;

    v_previous_logic := v_condition.logic_operator;
  END LOOP;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."evaluate_webhook_conditions"("p_webhook_id" "uuid", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_master_key_bytes"("p_key_name" "text") RETURNS "bytea"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_key bytea;
BEGIN
  SELECT key_bytes INTO v_key
  FROM public.app_encryption_keys
  WHERE key_name = p_key_name
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Master key not configured';
  END IF;

  RETURN v_key;
END;
$$;


ALTER FUNCTION "public"."get_active_master_key_bytes"("p_key_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_automation_performance_by_user"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'private', 'public'
    AS $$
  SELECT jsonb_agg(to_jsonb(mv) ORDER BY mv.last_activity_at DESC NULLS LAST)
  FROM private.automation_performance mv
  WHERE mv.user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_automation_performance_by_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cloud_integration_tokens"("p_provider" "public"."cloud_provider") RETURNS TABLE("integration_id" "uuid", "provider" "public"."cloud_provider", "access_token" "text", "refresh_token" "text", "expires_at" timestamp with time zone, "folder_id" "text", "folder_name" "text", "auto_sync_enabled" boolean, "last_sync_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'vault'
    AS $$
  SELECT
    ci.id as integration_id,
    ci.provider,
    (SELECT decrypted_secret FROM vault.decrypted_secrets ds WHERE ds.id = ci.access_token_secret_id) AS access_token,
    (SELECT decrypted_secret FROM vault.decrypted_secrets ds WHERE ds.id = ci.refresh_token_secret_id) AS refresh_token,
    ci.expires_at,
    ci.folder_id,
    ci.folder_name,
    ci.auto_sync_enabled,
    ci.last_sync_at
  FROM public.cloud_integrations ci
  WHERE ci.user_id = auth.uid() AND ci.provider = p_provider;
$$;


ALTER FUNCTION "public"."get_cloud_integration_tokens"("p_provider" "public"."cloud_provider") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_feature_adoption"("p_workspace_id" "uuid", "p_days" integer DEFAULT 30, "p_limit" integer DEFAULT 10) RETURNS TABLE("feature_name" "text", "users" bigint, "total_events" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_from timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'workspace_id is required';
  END IF;

  IF NOT public.is_workspace_member(p_workspace_id, v_user_id) THEN
    RAISE EXCEPTION 'Not a workspace member';
  END IF;

  v_from := now() - make_interval(days => GREATEST(1, COALESCE(p_days, 30)));

  RETURN QUERY
  WITH base AS (
    SELECT
      ae.user_id,
      COALESCE(NULLIF(ae.event_properties->>'feature_name', ''), 'unknown') AS feature_name
    FROM public.analytics_events ae
    WHERE ae.workspace_id = p_workspace_id
      AND ae.created_at >= v_from
      AND ae.event_type IN ('feature.discovered', 'feature_discovered')
  )
  SELECT
    b.feature_name,
    COUNT(DISTINCT b.user_id) AS users,
    COUNT(*) AS total_events
  FROM base b
  GROUP BY b.feature_name
  ORDER BY users DESC, total_events DESC
  LIMIT COALESCE(p_limit, 10);
END;
$$;


ALTER FUNCTION "public"."get_feature_adoption"("p_workspace_id" "uuid", "p_days" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_funnel_step_counts"("p_workspace_id" "uuid", "p_steps" "text"[]) RETURNS TABLE("step" "text", "users" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'workspace_id is required';
  END IF;

  IF NOT public.is_workspace_member(p_workspace_id, v_user_id) THEN
    RAISE EXCEPTION 'Not a workspace member';
  END IF;

  IF p_steps IS NULL OR array_length(p_steps, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    s.step,
    COUNT(DISTINCT ae.user_id) AS users
  FROM unnest(p_steps) AS s(step)
  LEFT JOIN public.analytics_events ae
    ON ae.workspace_id = p_workspace_id
   AND ae.event_type = s.step
  GROUP BY s.step
  ORDER BY array_position(p_steps, s.step);
END;
$$;


ALTER FUNCTION "public"."get_funnel_step_counts"("p_workspace_id" "uuid", "p_steps" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_global_webhook_analytics"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_total_webhooks bigint;
  v_active_webhooks bigint;
  v_total_deliveries bigint;
  v_successful_deliveries bigint;
  v_failed_deliveries bigint;
  v_avg_response_time_ms numeric;
BEGIN
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE COALESCE(is_active, true) = true)::bigint
  INTO v_total_webhooks, v_active_webhooks
  FROM public.webhooks
  WHERE user_id = auth.uid();

  SELECT
    COALESCE(SUM(total_deliveries), 0)::bigint,
    COALESCE(SUM(successful_deliveries), 0)::bigint,
    COALESCE(SUM(failed_deliveries), 0)::bigint,
    COALESCE(ROUND(AVG(avg_response_time_ms)::numeric, 2), 0)
  INTO v_total_deliveries, v_successful_deliveries, v_failed_deliveries, v_avg_response_time_ms
  FROM public.webhook_analytics_summary
  WHERE user_id = auth.uid();

  RETURN jsonb_build_object(
    'total_webhooks', COALESCE(v_total_webhooks, 0),
    'active_webhooks', COALESCE(v_active_webhooks, 0),
    'total_deliveries', COALESCE(v_total_deliveries, 0),
    'successful_deliveries', COALESCE(v_successful_deliveries, 0),
    'failed_deliveries', COALESCE(v_failed_deliveries, 0),
    'success_rate', CASE
      WHEN COALESCE(v_total_deliveries, 0) > 0 THEN ROUND((v_successful_deliveries::numeric / v_total_deliveries::numeric) * 100, 2)
      ELSE 0
    END,
    'avg_response_time_ms', COALESCE(v_avg_response_time_ms, 0)
  );
END;
$$;


ALTER FUNCTION "public"."get_global_webhook_analytics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_media_analytics"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_summary RECORD;
  v_quota RECORD;
BEGIN
  SELECT * INTO v_summary
  FROM public.media_analytics_summary
  WHERE user_id = auth.uid();

  SELECT * INTO v_quota
  FROM public.user_storage_quotas
  WHERE user_id = auth.uid();

  RETURN jsonb_build_object(
    'total_files', COALESCE(v_summary.total_files, 0),
    'total_size_bytes', COALESCE(v_summary.total_size_bytes, 0),
    'compressed_files', COALESCE(v_summary.compressed_files, 0),
    'total_savings_bytes', COALESCE(v_summary.total_savings_bytes, 0),
    'quota', jsonb_build_object(
      'used_bytes', COALESCE(v_quota.total_size_bytes, 0),
      'max_bytes', COALESCE(v_quota.max_size_bytes, 5368709120),
      'used_percentage', CASE
        WHEN COALESCE(v_quota.max_size_bytes, 5368709120) > 0
          THEN ROUND((COALESCE(v_quota.total_size_bytes, 0)::numeric / COALESCE(v_quota.max_size_bytes, 5368709120)) * 100, 2)
        ELSE 0
      END,
      'file_count', COALESCE(v_quota.file_count, 0),
      'max_file_count', COALESCE(v_quota.max_file_count, 1000)
    ),
    'by_type', jsonb_build_object(
      'image', jsonb_build_object(
        'count', COALESCE(v_summary.image_count, 0),
        'size_bytes', COALESCE(v_summary.image_size_bytes, 0)
      ),
      'video', jsonb_build_object(
        'count', COALESCE(v_summary.video_count, 0),
        'size_bytes', COALESCE(v_summary.video_size_bytes, 0)
      ),
      'document', jsonb_build_object(
        'count', COALESCE(v_summary.document_count, 0),
        'size_bytes', COALESCE(v_summary.document_size_bytes, 0)
      ),
      'audio', jsonb_build_object(
        'count', COALESCE(v_summary.audio_count, 0),
        'size_bytes', COALESCE(v_summary.audio_size_bytes, 0)
      )
    ),
    'first_upload_at', v_summary.first_upload_at,
    'last_upload_at', v_summary.last_upload_at
  );
END;
$$;


ALTER FUNCTION "public"."get_media_analytics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_media_for_export"("p_filters" "jsonb" DEFAULT NULL::"jsonb") RETURNS TABLE("id" "uuid", "file_name" "text", "file_type" "text", "file_size" bigint, "mime_type" "text", "storage_path" "text", "public_url" "text", "folder_name" "text", "tags" "text"[], "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ml.id,
    ml.file_name,
    ml.file_type,
    ml.file_size::bigint,
    ml.mime_type,
    ml.storage_path,
    ml.public_url,
    mf.name as folder_name,
    ARRAY(
      SELECT mt.name 
      FROM public.media_tag_assignments mta
      JOIN public.media_tags mt ON mta.tag_id = mt.id
      WHERE mta.media_id = ml.id
      ORDER BY mt.name
    ) as tags,
    (ml.created_at)::timestamptz,
    (ml.updated_at)::timestamptz
  FROM public.media_library ml
  LEFT JOIN public.media_folders mf ON ml.folder_id = mf.id
  WHERE ml.user_id = auth.uid()
  ORDER BY ml.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_media_for_export"("p_filters" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_media_largest_files"("p_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "file_name" "text", "file_type" "text", "file_size" bigint, "mime_type" "text", "created_at" timestamp with time zone, "folder_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    ml.id,
    ml.file_name,
    ml.file_type,
    ml.file_size,
    ml.mime_type,
    ml.created_at,
    ml.folder_id
  FROM public.media_library ml
  WHERE ml.user_id = auth.uid()
  ORDER BY ml.file_size DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;


ALTER FUNCTION "public"."get_media_largest_files"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_media_top_tags"("p_limit" integer DEFAULT 10) RETURNS TABLE("tag_id" "uuid", "tag_name" "text", "color" "text", "usage_count" bigint, "total_size_bytes" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    mt.id as tag_id,
    mt.name as tag_name,
    mt.color,
    COUNT(mta.media_id)::bigint as usage_count,
    COALESCE(SUM(ml.file_size), 0)::bigint as total_size_bytes
  FROM public.media_tags mt
  LEFT JOIN public.media_tag_assignments mta ON mt.id = mta.tag_id
  LEFT JOIN public.media_library ml ON mta.media_id = ml.id
  WHERE mt.user_id = auth.uid()
  GROUP BY mt.id, mt.name, mt.color
  ORDER BY usage_count DESC, total_size_bytes DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;


ALTER FUNCTION "public"."get_media_top_tags"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_media_upload_trend"("p_days" integer DEFAULT 30) RETURNS TABLE("upload_date" "date", "file_count" bigint, "total_size_bytes" bigint, "images" bigint, "videos" bigint, "documents" bigint, "audio" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    (date_trunc('day', ml.created_at))::date as upload_date,
    COUNT(*)::bigint as file_count,
    COALESCE(SUM(ml.file_size), 0)::bigint as total_size_bytes,
    COUNT(*) FILTER (WHERE ml.file_type = 'image')::bigint as images,
    COUNT(*) FILTER (WHERE ml.file_type = 'video')::bigint as videos,
    COUNT(*) FILTER (WHERE ml.file_type = 'document')::bigint as documents,
    COUNT(*) FILTER (WHERE ml.file_type = 'audio')::bigint as audio
  FROM public.media_library ml
  WHERE ml.user_id = auth.uid()
    AND ml.created_at >= NOW() - make_interval(days => GREATEST(LEAST(p_days, 365), 1))
  GROUP BY (date_trunc('day', ml.created_at))::date
  ORDER BY upload_date ASC;
$$;


ALTER FUNCTION "public"."get_media_upload_trend"("p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_onboarding_status"() RETURNS TABLE("user_id" "uuid", "whatsapp_connected" boolean, "contacts_imported" boolean, "automation_created" boolean, "automation_activated" boolean, "completed_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT
    auth.uid() AS user_id,
    EXISTS(
      SELECT 1 FROM public.onboarding_progress op
      WHERE op.user_id = auth.uid() AND op.step_id = 'whatsapp_connected'
    ) AS whatsapp_connected,
    EXISTS(
      SELECT 1 FROM public.onboarding_progress op
      WHERE op.user_id = auth.uid() AND op.step_id = 'contacts_imported'
    ) AS contacts_imported,
    EXISTS(
      SELECT 1 FROM public.onboarding_progress op
      WHERE op.user_id = auth.uid() AND op.step_id = 'automation_created'
    ) AS automation_created,
    EXISTS(
      SELECT 1 FROM public.onboarding_progress op
      WHERE op.user_id = auth.uid() AND op.step_id = 'automation_activated'
    ) AS automation_activated,
    (
      SELECT completed_at FROM public.onboarding_progress op
      WHERE op.user_id = auth.uid() AND op.step_id = 'onboarding_completed'
      ORDER BY completed_at DESC
      LIMIT 1
    ) AS completed_at;
$$;


ALTER FUNCTION "public"."get_my_onboarding_status"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_retry_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "webhook_id" "uuid" NOT NULL,
    "webhook_log_id" "uuid",
    "event_type" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "attempt_number" integer DEFAULT 1 NOT NULL,
    "max_attempts" integer DEFAULT 5 NOT NULL,
    "status" "public"."retry_status" DEFAULT 'pending'::"public"."retry_status" NOT NULL,
    "next_retry_at" timestamp with time zone,
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."webhook_retry_queue" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pending_retries"("p_limit" integer DEFAULT 10) RETURNS SETOF "public"."webhook_retry_queue"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  UPDATE public.webhook_retry_queue
  SET status = 'processing',
      updated_at = NOW()
  WHERE id IN (
    SELECT id
    FROM public.webhook_retry_queue
    WHERE status = 'pending'
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      AND attempt_number <= max_attempts
    ORDER BY COALESCE(next_retry_at, created_at) ASC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;


ALTER FUNCTION "public"."get_pending_retries"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_kpis"("p_workspace_id" "uuid", "p_days" integer DEFAULT 30) RETURNS TABLE("dau" bigint, "wau" bigint, "mau" bigint, "ttfv_avg_minutes" numeric, "ttfv_median_minutes" numeric, "window_days" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_now timestamptz := now();
  v_from timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'workspace_id is required';
  END IF;

  IF NOT public.is_workspace_member(p_workspace_id, v_user_id) THEN
    RAISE EXCEPTION 'Not a workspace member';
  END IF;

  window_days := GREATEST(1, COALESCE(p_days, 30));
  v_from := v_now - make_interval(days => window_days);

  SELECT COUNT(DISTINCT ae.user_id)
    INTO dau
  FROM public.analytics_events ae
  WHERE ae.workspace_id = p_workspace_id
    AND ae.created_at >= (v_now - interval '1 day');

  SELECT COUNT(DISTINCT ae.user_id)
    INTO wau
  FROM public.analytics_events ae
  WHERE ae.workspace_id = p_workspace_id
    AND ae.created_at >= (v_now - interval '7 days');

  SELECT COUNT(DISTINCT ae.user_id)
    INTO mau
  FROM public.analytics_events ae
  WHERE ae.workspace_id = p_workspace_id
    AND ae.created_at >= (v_now - interval '30 days');

  WITH first_any AS (
    SELECT user_id, MIN(created_at) AS first_event_at
    FROM public.analytics_events
    WHERE workspace_id = p_workspace_id
      AND created_at >= v_from
    GROUP BY user_id
  ),
  first_value AS (
    SELECT user_id, MIN(created_at) AS first_value_at
    FROM public.analytics_events
    WHERE workspace_id = p_workspace_id
      AND created_at >= v_from
      AND event_type IN ('automation.created', 'automation_created')
    GROUP BY user_id
  ),
  diffs AS (
    SELECT
      a.user_id,
      EXTRACT(EPOCH FROM (v.first_value_at - a.first_event_at)) / 60.0 AS minutes
    FROM first_any a
    JOIN first_value v ON v.user_id = a.user_id
    WHERE v.first_value_at >= a.first_event_at
  )
  SELECT
    COALESCE(AVG(minutes), 0),
    COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY minutes), 0)
  INTO ttfv_avg_minutes, ttfv_median_minutes
  FROM diffs;

  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."get_product_kpis"("p_workspace_id" "uuid", "p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_retention_cohorts"("p_workspace_id" "uuid", "p_lookback_days" integer DEFAULT 60) RETURNS TABLE("cohort_date" "date", "cohort_size" bigint, "retained_d1" bigint, "retained_d7" bigint, "retained_d30" bigint, "retention_d1_pct" numeric, "retention_d7_pct" numeric, "retention_d30_pct" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_days integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'workspace_id is required';
  END IF;

  IF NOT public.is_workspace_member(p_workspace_id, v_user_id) THEN
    RAISE EXCEPTION 'Not a workspace member';
  END IF;

  v_days := GREATEST(1, COALESCE(p_lookback_days, 60));

  RETURN QUERY
  WITH cohort AS (
    SELECT
      user_id,
      MIN(created_at)::date AS cohort_date
    FROM public.analytics_events
    WHERE workspace_id = p_workspace_id
    GROUP BY user_id
  ),
  cohort_filtered AS (
    SELECT *
    FROM cohort
    WHERE cohort_date BETWEEN (current_date - v_days) AND current_date
  ),
  activity AS (
    SELECT ae.user_id, ae.created_at::date AS activity_date
    FROM public.analytics_events ae
    WHERE ae.workspace_id = p_workspace_id
  )
  SELECT
    c.cohort_date,
    COUNT(DISTINCT c.user_id) AS cohort_size,
    COUNT(DISTINCT CASE WHEN a.activity_date = c.cohort_date + 1 THEN c.user_id END) AS retained_d1,
    COUNT(DISTINCT CASE WHEN a.activity_date = c.cohort_date + 7 THEN c.user_id END) AS retained_d7,
    COUNT(DISTINCT CASE WHEN a.activity_date = c.cohort_date + 30 THEN c.user_id END) AS retained_d30,
    (COUNT(DISTINCT CASE WHEN a.activity_date = c.cohort_date + 1 THEN c.user_id END)::numeric
      / NULLIF(COUNT(DISTINCT c.user_id), 0)) * 100 AS retention_d1_pct,
    (COUNT(DISTINCT CASE WHEN a.activity_date = c.cohort_date + 7 THEN c.user_id END)::numeric
      / NULLIF(COUNT(DISTINCT c.user_id), 0)) * 100 AS retention_d7_pct,
    (COUNT(DISTINCT CASE WHEN a.activity_date = c.cohort_date + 30 THEN c.user_id END)::numeric
      / NULLIF(COUNT(DISTINCT c.user_id), 0)) * 100 AS retention_d30_pct
  FROM cohort_filtered c
  LEFT JOIN activity a ON a.user_id = c.user_id
  GROUP BY c.cohort_date
  ORDER BY c.cohort_date;
END;
$$;


ALTER FUNCTION "public"."get_retention_cohorts"("p_workspace_id" "uuid", "p_lookback_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_slow_queries"("limit_rows" integer DEFAULT 20) RETURNS TABLE("query" "text", "calls" bigint, "avg_time_ms" double precision, "total_exec_time" double precision, "avg_rows" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    s.query,
    s.calls,
    (s.total_exec_time / NULLIF(s.calls, 0)) AS avg_time_ms,
    s.total_exec_time,
    (s.rows::double precision / NULLIF(s.calls, 0)) AS avg_rows
  FROM extensions.pg_stat_statements s
  WHERE s.calls > 100
  ORDER BY s.total_exec_time DESC
  LIMIT GREATEST(1, LEAST(limit_rows, 200));
END;
$$;


ALTER FUNCTION "public"."get_slow_queries"("limit_rows" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_storage_stats_by_user"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'private', 'public'
    AS $$
  SELECT to_jsonb(mv)
  FROM private.storage_stats_by_user mv
  WHERE mv.user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_storage_stats_by_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_webhook_analytics"("p_webhook_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_summary RECORD;
BEGIN
  -- ensure ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.webhooks w
    WHERE w.id = p_webhook_id AND w.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem acesso ao webhook';
  END IF;

  SELECT * INTO v_summary
  FROM public.webhook_analytics_summary
  WHERE webhook_id = p_webhook_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'webhook_id', p_webhook_id,
      'total_deliveries', 0,
      'successful_deliveries', 0,
      'failed_deliveries', 0,
      'success_rate_percentage', 0,
      'avg_response_time_ms', 0
    );
  END IF;

  RETURN jsonb_build_object(
    'webhook_id', v_summary.webhook_id,
    'webhook_name', v_summary.webhook_name,
    'url', v_summary.url,
    'total_deliveries', v_summary.total_deliveries,
    'successful_deliveries', v_summary.successful_deliveries,
    'failed_deliveries', v_summary.failed_deliveries,
    'success_rate_percentage', v_summary.success_rate_percentage,
    'avg_response_time_ms', v_summary.avg_response_time_ms,
    'max_response_time_ms', v_summary.max_response_time_ms,
    'first_delivery_at', v_summary.first_delivery_at,
    'last_delivery_at', v_summary.last_delivery_at,
    'circuit_breaker_state', v_summary.circuit_breaker_state,
    'consecutive_failures', v_summary.consecutive_failures
  );
END;
$$;


ALTER FUNCTION "public"."get_webhook_analytics"("p_webhook_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_circuit_breaker" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "webhook_id" "uuid" NOT NULL,
    "state" "public"."circuit_breaker_state" DEFAULT 'closed'::"public"."circuit_breaker_state" NOT NULL,
    "failure_count" integer DEFAULT 0 NOT NULL,
    "success_count" integer DEFAULT 0 NOT NULL,
    "last_failure_at" timestamp with time zone,
    "last_success_at" timestamp with time zone,
    "opened_at" timestamp with time zone,
    "half_opened_at" timestamp with time zone,
    "consecutive_failures" integer DEFAULT 0 NOT NULL,
    "consecutive_successes" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."webhook_circuit_breaker" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "webhook_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "request_headers" "jsonb",
    "response_status" integer,
    "response_body" "text",
    "error_message" "text",
    "attempt_number" integer DEFAULT 1,
    "executed_at" timestamp with time zone DEFAULT "now"(),
    "success" boolean DEFAULT false,
    "duration_ms" integer,
    "response_headers" "jsonb",
    "status_text" "text"
);


ALTER TABLE "public"."webhook_logs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."webhook_logs"."request_headers" IS 'Headers sent to the webhook endpoint at execution time.';



COMMENT ON COLUMN "public"."webhook_logs"."response_headers" IS 'Response headers returned by the webhook endpoint.';



COMMENT ON COLUMN "public"."webhook_logs"."status_text" IS 'HTTP status text returned by the webhook endpoint (best-effort).';



CREATE TABLE IF NOT EXISTS "public"."webhooks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "url" "text" NOT NULL,
    "secret" "text",
    "events" "text"[] NOT NULL,
    "headers" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "retry_config" "jsonb" DEFAULT '{"max_attempts": 3, "backoff_multiplier": 2}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "rate_limit_per_minute" integer DEFAULT 30 NOT NULL,
    "timeout_seconds" integer DEFAULT 10 NOT NULL,
    "template_id" "uuid",
    "template_provider" "public"."webhook_provider",
    "payload_template" "jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "enable_transformation" boolean DEFAULT false NOT NULL,
    "transformation_script" "text",
    "enable_conditions" boolean DEFAULT false NOT NULL,
    "conditions" "jsonb",
    "workspace_id" "uuid",
    CONSTRAINT "webhooks_rate_limit_per_minute_range" CHECK ((("rate_limit_per_minute" >= 1) AND ("rate_limit_per_minute" <= 1000))),
    CONSTRAINT "webhooks_timeout_seconds_range" CHECK ((("timeout_seconds" >= 1) AND ("timeout_seconds" <= 30))),
    CONSTRAINT "webhooks_url_must_be_https" CHECK (("url" ~~ 'https://%'::"text"))
);


ALTER TABLE "public"."webhooks" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."webhook_analytics_summary" AS
 SELECT "w"."id" AS "webhook_id",
    "w"."user_id",
    "w"."name" AS "webhook_name",
    "w"."url",
    "count"("wl"."id") AS "total_deliveries",
    "count"("wl"."id") FILTER (WHERE (("wl"."response_status" >= 200) AND ("wl"."response_status" < 300))) AS "successful_deliveries",
    "count"("wl"."id") FILTER (WHERE (("wl"."response_status" >= 400) OR ("wl"."error_message" IS NOT NULL) OR ("wl"."success" = false))) AS "failed_deliveries",
    "round"("avg"("wl"."duration_ms"), 2) AS "avg_response_time_ms",
    "max"("wl"."duration_ms") AS "max_response_time_ms",
    "min"("wl"."executed_at") AS "first_delivery_at",
    "max"("wl"."executed_at") AS "last_delivery_at",
        CASE
            WHEN ("count"("wl"."id") > 0) THEN "round"(((("count"("wl"."id") FILTER (WHERE (("wl"."response_status" >= 200) AND ("wl"."response_status" < 300))))::numeric / ("count"("wl"."id"))::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS "success_rate_percentage",
    "wcb"."state" AS "circuit_breaker_state",
    "wcb"."consecutive_failures"
   FROM (("public"."webhooks" "w"
     LEFT JOIN "public"."webhook_logs" "wl" ON ((("w"."id" = "wl"."webhook_id") AND ("wl"."executed_at" >= ("now"() - '90 days'::interval)))))
     LEFT JOIN "public"."webhook_circuit_breaker" "wcb" ON (("w"."id" = "wcb"."webhook_id")))
  GROUP BY "w"."id", "w"."user_id", "w"."name", "w"."url", "wcb"."state", "wcb"."consecutive_failures"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."webhook_analytics_summary" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_webhook_analytics_summaries"() RETURNS SETOF "public"."webhook_analytics_summary"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT *
  FROM public.webhook_analytics_summary
  WHERE user_id = auth.uid()
  ORDER BY last_delivery_at DESC NULLS LAST;
$$;


ALTER FUNCTION "public"."get_webhook_analytics_summaries"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_webhook_deliveries_by_day"("p_webhook_id" "uuid", "p_days" integer DEFAULT 30) RETURNS TABLE("delivery_date" "date", "total_deliveries" bigint, "successful" bigint, "failed" bigint, "avg_response_time_ms" numeric)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    (date_trunc('day', wl.executed_at))::date as delivery_date,
    COUNT(*)::bigint as total_deliveries,
    COUNT(*) FILTER (WHERE wl.response_status >= 200 AND wl.response_status < 300)::bigint as successful,
    COUNT(*) FILTER (WHERE (wl.response_status >= 400) OR wl.error_message IS NOT NULL OR wl.success = false)::bigint as failed,
    ROUND(AVG(wl.duration_ms)::numeric, 2) as avg_response_time_ms
  FROM public.webhook_logs wl
  WHERE wl.webhook_id = p_webhook_id
    AND wl.executed_at >= NOW() - make_interval(days => GREATEST(LEAST(p_days, 365), 1))
    AND EXISTS (
      SELECT 1 FROM public.webhooks w
      WHERE w.id = p_webhook_id AND w.user_id = auth.uid()
    )
  GROUP BY (date_trunc('day', wl.executed_at))::date
  ORDER BY delivery_date ASC;
$$;


ALTER FUNCTION "public"."get_webhook_deliveries_by_day"("p_webhook_id" "uuid", "p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_webhook_health_check"() RETURNS TABLE("webhook_id" "uuid", "name" "text", "url" "text", "is_active" boolean, "deliveries_24h" bigint, "failures_24h" bigint, "deliveries_7d" bigint, "failures_7d" bigint, "circuit_state" "public"."circuit_breaker_state", "consecutive_failures" integer, "health_status" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    w.id as webhook_id,
    w.name,
    w.url,
    COALESCE(w.is_active, true) as is_active,

    COUNT(wl.id) FILTER (WHERE wl.executed_at >= NOW() - INTERVAL '24 hours')::bigint as deliveries_24h,
    COUNT(wl.id) FILTER (
      WHERE wl.executed_at >= NOW() - INTERVAL '24 hours'
        AND ((wl.response_status >= 400) OR wl.error_message IS NOT NULL OR wl.success = false)
    )::bigint as failures_24h,

    COUNT(wl.id) FILTER (WHERE wl.executed_at >= NOW() - INTERVAL '7 days')::bigint as deliveries_7d,
    COUNT(wl.id) FILTER (
      WHERE wl.executed_at >= NOW() - INTERVAL '7 days'
        AND ((wl.response_status >= 400) OR wl.error_message IS NOT NULL OR wl.success = false)
    )::bigint as failures_7d,

    wcb.state as circuit_state,
    wcb.consecutive_failures,

    CASE
      WHEN wcb.state = 'open' THEN 'critical'
      WHEN COUNT(wl.id) FILTER (
        WHERE wl.executed_at >= NOW() - INTERVAL '24 hours'
          AND ((wl.response_status >= 400) OR wl.error_message IS NOT NULL OR wl.success = false)
      ) > 10 THEN 'warning'
      WHEN COUNT(wl.id) FILTER (WHERE wl.executed_at >= NOW() - INTERVAL '24 hours') = 0 THEN 'inactive'
      ELSE 'healthy'
    END as health_status

  FROM public.webhooks w
  LEFT JOIN public.webhook_logs wl ON w.id = wl.webhook_id
  LEFT JOIN public.webhook_circuit_breaker wcb ON w.id = wcb.webhook_id
  WHERE w.user_id = auth.uid()
  GROUP BY w.id, w.name, w.url, w.is_active, wcb.state, wcb.consecutive_failures
  ORDER BY health_status DESC;
$$;


ALTER FUNCTION "public"."get_webhook_health_check"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_webhook_latency_percentiles"("p_minutes" integer DEFAULT 60) RETURNS TABLE("p50_latency_ms" numeric, "p95_latency_ms" numeric, "p99_latency_ms" numeric)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT
    percentile_cont(0.50) WITHIN GROUP (ORDER BY l.duration_ms) AS p50_latency_ms,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY l.duration_ms) AS p95_latency_ms,
    percentile_cont(0.99) WITHIN GROUP (ORDER BY l.duration_ms) AS p99_latency_ms
  FROM public.webhook_logs l
  JOIN public.webhooks w ON w.id = l.webhook_id
  WHERE w.user_id = auth.uid()
    AND l.executed_at IS NOT NULL
    AND l.executed_at > now() - make_interval(mins => p_minutes)
    AND l.duration_ms IS NOT NULL;
$$;


ALTER FUNCTION "public"."get_webhook_latency_percentiles"("p_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_webhook_secret_for_delivery"("p_webhook_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_row record;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT encrypted_value INTO v_row
  FROM public.webhook_secrets
  WHERE webhook_id = p_webhook_id
    AND active = true
  LIMIT 1;

  IF v_row.encrypted_value IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN public.decrypt_webhook_secret(v_row.encrypted_value);
END;
$$;


ALTER FUNCTION "public"."get_webhook_secret_for_delivery"("p_webhook_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_webhook_secrets_for_delivery"("p_webhook_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cur record;
  v_prev record;
  v_now timestamptz := now();
  v_cur_plain text;
  v_prev_plain text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT encrypted_value, rotated_at
    INTO v_cur
  FROM public.webhook_secrets
  WHERE webhook_id = p_webhook_id
    AND active = true
  ORDER BY rotated_at DESC
  LIMIT 1;

  IF v_cur.encrypted_value IS NULL THEN
    RETURN jsonb_build_object('current', null, 'previous', null);
  END IF;

  v_cur_plain := public.decrypt_webhook_secret(v_cur.encrypted_value);

  -- previous is the most recent inactive secret
  SELECT encrypted_value, grace_expires_at
    INTO v_prev
  FROM public.webhook_secrets
  WHERE webhook_id = p_webhook_id
    AND active = false
  ORDER BY rotated_at DESC
  LIMIT 1;

  IF v_prev.encrypted_value IS NOT NULL AND v_prev.grace_expires_at IS NOT NULL AND v_prev.grace_expires_at > v_now THEN
    v_prev_plain := public.decrypt_webhook_secret(v_prev.encrypted_value);
    RETURN jsonb_build_object(
      'current', v_cur_plain,
      'previous', v_prev_plain,
      'previous_grace_expires_at', v_prev.grace_expires_at
    );
  END IF;

  RETURN jsonb_build_object('current', v_cur_plain, 'previous', null);
END;
$$;


ALTER FUNCTION "public"."get_webhook_secrets_for_delivery"("p_webhook_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_webhook_stats_by_user"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'private', 'public'
    AS $$
  SELECT to_jsonb(mv)
  FROM private.webhook_stats_by_user mv
  WHERE mv.user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_webhook_stats_by_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_webhook_status_code_distribution"("p_webhook_id" "uuid", "p_days" integer DEFAULT 30) RETURNS TABLE("status_code" integer, "count" bigint, "percentage" numeric)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH base AS (
    SELECT wl.response_status as status_code
    FROM public.webhook_logs wl
    WHERE wl.webhook_id = p_webhook_id
      AND wl.response_status IS NOT NULL
      AND wl.executed_at >= NOW() - make_interval(days => GREATEST(LEAST(p_days, 365), 1))
      AND EXISTS (
        SELECT 1 FROM public.webhooks w
        WHERE w.id = p_webhook_id AND w.user_id = auth.uid()
      )
  )
  SELECT
    status_code,
    COUNT(*)::bigint as count,
    ROUND((COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER (), 0)) * 100, 2) as percentage
  FROM base
  GROUP BY status_code
  ORDER BY count DESC;
$$;


ALTER FUNCTION "public"."get_webhook_status_code_distribution"("p_webhook_id" "uuid", "p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_webhook_top_events"("p_webhook_id" "uuid", "p_days" integer DEFAULT 30, "p_limit" integer DEFAULT 10) RETURNS TABLE("event_type" "text", "event_count" bigint, "successful_count" bigint, "failed_count" bigint, "last_triggered_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    wl.event_type,
    COUNT(*)::bigint as event_count,
    COUNT(*) FILTER (WHERE wl.response_status >= 200 AND wl.response_status < 300)::bigint as successful_count,
    COUNT(*) FILTER (WHERE (wl.response_status >= 400) OR wl.error_message IS NOT NULL OR wl.success = false)::bigint as failed_count,
    MAX(wl.executed_at) as last_triggered_at
  FROM public.webhook_logs wl
  WHERE wl.webhook_id = p_webhook_id
    AND wl.executed_at >= NOW() - make_interval(days => GREATEST(LEAST(p_days, 365), 1))
    AND EXISTS (
      SELECT 1 FROM public.webhooks w
      WHERE w.id = p_webhook_id AND w.user_id = auth.uid()
    )
  GROUP BY wl.event_type
  ORDER BY event_count DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;


ALTER FUNCTION "public"."get_webhook_top_events"("p_webhook_id" "uuid", "p_days" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_webhook_uptime_daily"("p_days" integer DEFAULT 30) RETURNS TABLE("day" "date", "successful" bigint, "total" bigint, "uptime_pct" numeric)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT
    date_trunc('day', l.executed_at)::date AS day,
    count(*) FILTER (WHERE l.success IS TRUE) AS successful,
    count(*) AS total,
    CASE
      WHEN count(*) = 0 THEN 0
      ELSE (count(*) FILTER (WHERE l.success IS TRUE)::numeric / count(*)::numeric) * 100
    END AS uptime_pct
  FROM public.webhook_logs l
  JOIN public.webhooks w ON w.id = l.webhook_id
  WHERE w.user_id = auth.uid()
    AND l.executed_at IS NOT NULL
    AND l.executed_at > now() - make_interval(days => p_days)
  GROUP BY 1
  ORDER BY 1;
$$;


ALTER FUNCTION "public"."get_webhook_uptime_daily"("p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_webhook_uptime_hourly"("p_hours" integer DEFAULT 24) RETURNS TABLE("hour" timestamp with time zone, "successful" bigint, "total" bigint, "uptime_pct" numeric)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT
    date_trunc('hour', l.executed_at) AS hour,
    count(*) FILTER (WHERE l.success IS TRUE) AS successful,
    count(*) AS total,
    CASE
      WHEN count(*) = 0 THEN 0
      ELSE (count(*) FILTER (WHERE l.success IS TRUE)::numeric / count(*)::numeric) * 100
    END AS uptime_pct
  FROM public.webhook_logs l
  JOIN public.webhooks w ON w.id = l.webhook_id
  WHERE w.user_id = auth.uid()
    AND l.executed_at IS NOT NULL
    AND l.executed_at > now() - make_interval(hours => p_hours)
  GROUP BY 1
  ORDER BY 1;
$$;


ALTER FUNCTION "public"."get_webhook_uptime_hourly"("p_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."global_search"("p_query" "text", "p_limit" integer DEFAULT 20) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_media JSONB;
  v_webhooks JSONB;
  v_folders JSONB;
  v_tags JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'type', 'media',
      'title', file_name,
      'subtitle', file_type,
      'url', '/media/' || id,
      'score', match_score
    )
  ) INTO v_media
  FROM public.search_media(
    p_query => p_query,
    p_limit => GREATEST(1, p_limit / 4)
  );

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'type', 'webhook',
      'title', name,
      'subtitle', url,
      'url', '/webhooks/' || id,
      'score', match_score
    )
  ) INTO v_webhooks
  FROM public.search_webhooks(
    p_query => p_query,
    p_limit => GREATEST(1, p_limit / 4)
  );

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'type', 'folder',
      'title', name,
      'subtitle', 'Pasta de mídia',
      'url', '/media?folder=' || id,
      'score', similarity(name, p_query)
    )
  ) INTO v_folders
  FROM public.media_folders
  WHERE user_id = auth.uid()
    AND (name ILIKE '%' || p_query || '%' OR name % p_query)
  ORDER BY similarity(name, p_query) DESC
  LIMIT GREATEST(1, p_limit / 4);

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'type', 'tag',
      'title', name,
      'subtitle', 'Tag de mídia',
      'url', '/media?tag=' || id,
      'score', similarity(name, p_query)
    )
  ) INTO v_tags
  FROM public.media_tags
  WHERE user_id = auth.uid()
    AND (name ILIKE '%' || p_query || '%' OR name % p_query)
  ORDER BY similarity(name, p_query) DESC
  LIMIT GREATEST(1, p_limit / 4);

  RETURN jsonb_build_object(
    'media', COALESCE(v_media, '[]'::jsonb),
    'webhooks', COALESCE(v_webhooks, '[]'::jsonb),
    'folders', COALESCE(v_folders, '[]'::jsonb),
    'tags', COALESCE(v_tags, '[]'::jsonb)
  );
END;
$$;


ALTER FUNCTION "public"."global_search"("p_query" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_permission"("permission_name" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.user_id = auth.uid()
      and public.workspace_has_permission(wm.workspace_id, public.normalize_permission_name(permission_name), auth.uid())
  );
$$;


ALTER FUNCTION "public"."has_permission"("permission_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_permission"("permission_name" "text", "workspace_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.workspace_has_permission(workspace_id, public.normalize_permission_name(permission_name), auth.uid());
$$;


ALTER FUNCTION "public"."has_permission"("permission_name" "text", "workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_template_use_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.automation_templates
  SET use_count = use_count + 1
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_template_use_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_allowed_consent_type"("p_type" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT p_type IN ('analytics','marketing','third_party');
$$;


ALTER FUNCTION "public"."is_allowed_consent_type"("p_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_workspace_member"("p_workspace_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = p_user_id
  );
$$;


ALTER FUNCTION "public"."is_workspace_member"("p_workspace_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_audit_event"("p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid" DEFAULT NULL::"uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_user_agent" "text" DEFAULT NULL::"text", "p_session_id" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.audit_events (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    ip_address,
    user_agent,
    session_id
  ) VALUES (
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    COALESCE(p_metadata, '{}'::jsonb),
    inet_client_addr(),
    p_user_agent,
    p_session_id
  )
  RETURNING id INTO event_id;

  RETURN event_id;
END;
$$;


ALTER FUNCTION "public"."log_audit_event"("p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb", "p_user_agent" "text", "p_session_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_all_notifications_read"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.notifications
  SET read = true,
      read_at = now()
  WHERE user_id = auth.uid()
    AND read = false;
END;
$$;


ALTER FUNCTION "public"."mark_all_notifications_read"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_conversation_as_read"("p_conversation_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_workspace_id uuid;
  v_role text;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);

  -- Allow service_role (server) OR authenticated users with permission.
  IF v_role = 'service_role' OR v_role = 'supabase_admin' THEN
    UPDATE public.whatsapp_conversations
    SET unread_count = 0,
        updated_at = now()
    WHERE id = p_conversation_id;
    RETURN;
  END IF;

  SELECT workspace_id INTO v_workspace_id
  FROM public.whatsapp_conversations
  WHERE id = p_conversation_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF NOT public.is_workspace_member(v_workspace_id, auth.uid()) OR NOT public.has_permission('whatsapp.manage', v_workspace_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.whatsapp_conversations
  SET unread_count = 0,
      updated_at = now()
  WHERE id = p_conversation_id;
END;
$$;


ALTER FUNCTION "public"."mark_conversation_as_read"("p_conversation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.notifications
  SET read = true,
      read_at = now()
  WHERE id = p_notification_id
    AND user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."move_media_to_folder"("p_media_ids" "uuid"[], "p_folder_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.media_library
  SET folder_id = p_folder_id,
      updated_at = NOW()
  WHERE id = ANY(p_media_ids)
    AND user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."move_media_to_folder"("p_media_ids" "uuid"[], "p_folder_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_permission_name"("p" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  select replace(coalesce(p, ''), ':', '.');
$$;


ALTER FUNCTION "public"."normalize_permission_name"("p" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_phone"("phone_input" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  IF phone_input IS NULL THEN RETURN NULL; END IF;
  RETURN regexp_replace(phone_input, '[^0-9]', '', 'g');
END;
$$;


ALTER FUNCTION "public"."normalize_phone"("phone_input" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."normalize_phone"("phone_input" "text") IS 'Remove formatação de telefones';



CREATE OR REPLACE FUNCTION "public"."notify_circuit_breaker_open"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_webhook RECORD;
BEGIN
  IF NEW.state = 'open' AND (TG_OP = 'INSERT' OR OLD.state IS DISTINCT FROM 'open') THEN
    SELECT * INTO v_webhook
    FROM public.webhooks
    WHERE id = NEW.webhook_id;

    IF FOUND THEN
      PERFORM public.create_notification(
        v_webhook.user_id,
        'webhook_circuit_open',
        'Circuit Breaker ativado',
        'O webhook "' || v_webhook.name || '" foi temporariamente desabilitado devido a falhas consecutivas.',
        'critical',
        '/dashboard/configuracoes?tab=integracoes',
        'Ver Integrações',
        jsonb_build_object('webhook_id', NEW.webhook_id::text),
        NULL
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_circuit_breaker_open"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_data_deletion_approved"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM pg_notify(
      'data_deletion_approved',
      jsonb_build_object(
        'request_id', NEW.id,
        'user_id', NEW.user_id,
        'approved_at', now()
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_data_deletion_approved"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_storage_quota"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_new_pct NUMERIC;
  v_old_pct NUMERIC;
BEGIN
  v_new_pct := (NEW.total_size_bytes::numeric / NULLIF(NEW.max_size_bytes::numeric, 0)) * 100;
  v_old_pct := (OLD.total_size_bytes::numeric / NULLIF(OLD.max_size_bytes::numeric, 0)) * 100;

  -- Crossed 80%
  IF v_old_pct < 80 AND v_new_pct >= 80 AND v_new_pct < 95 THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'storage_quota_warning',
      'Storage em 80%',
      'Você está usando ' || floor(v_new_pct)::int || '% da sua quota de storage.',
      'medium',
      '/dashboard/analytics',
      'Ver Analytics',
      jsonb_build_object('percentage', v_new_pct, 'used_bytes', NEW.total_size_bytes, 'max_bytes', NEW.max_size_bytes),
      72
    );
  END IF;

  -- Crossed 95%
  IF v_old_pct < 95 AND v_new_pct >= 95 THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'storage_quota_critical',
      'Storage quase cheio!',
      'Você está usando ' || floor(v_new_pct)::int || '% da sua quota. Considere excluir arquivos antigos.',
      'critical',
      '/dashboard/analytics',
      'Gerenciar Storage',
      jsonb_build_object('percentage', v_new_pct, 'used_bytes', NEW.total_size_bytes, 'max_bytes', NEW.max_size_bytes),
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_storage_quota"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_webhook_failures"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_webhook RECORD;
  v_recent_failures INTEGER;
  v_webhook_id TEXT;
BEGIN
  SELECT * INTO v_webhook
  FROM public.webhooks
  WHERE id = NEW.webhook_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_recent_failures
  FROM public.webhook_logs wl
  WHERE wl.webhook_id = NEW.webhook_id
    AND coalesce(wl.executed_at, now()) >= now() - interval '1 hour'
    AND (
      wl.success IS DISTINCT FROM true
      OR (wl.response_status IS NOT NULL AND wl.response_status >= 400)
      OR wl.error_message IS NOT NULL
    );

  IF v_recent_failures >= 5 THEN
    v_webhook_id := NEW.webhook_id::text;

    IF NOT EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = v_webhook.user_id
        AND n.type = 'webhook_failure'
        AND (n.metadata->>'webhook_id') = v_webhook_id
        AND n.created_at >= now() - interval '30 minutes'
    ) THEN
      PERFORM public.create_notification(
        v_webhook.user_id,
        'webhook_failure',
        'Webhook com múltiplas falhas',
        v_webhook.name || ' teve ' || v_recent_failures || ' falhas na última hora.',
        'high',
        '/dashboard/configuracoes?tab=integracoes',
        'Ver Integrações',
        jsonb_build_object('webhook_id', v_webhook_id, 'failure_count', v_recent_failures),
        24
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_webhook_failures"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_plaintext_webhook_secret"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.secret IS NOT NULL AND length(trim(NEW.secret)) > 0 THEN
    RAISE EXCEPTION 'Plaintext webhook.secret is forbidden; use vault';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_plaintext_webhook_secret"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_data_deletion"("p_request_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_req public.data_deletion_requests%ROWTYPE;
  v_user_id uuid;

  v_deleted_webhooks integer := 0;
  v_deleted_webhook_logs integer := 0;
  v_deleted_webhook_conditions integer := 0;
  v_deleted_webhook_retry_queue integer := 0;
  v_deleted_webhook_retry_config integer := 0;
  v_deleted_webhook_circuit integer := 0;
  v_deleted_webhook_rate_limit integer := 0;

  v_anonymized_messages integer := 0;
  v_anonymized_contacts integer := 0;

  v_deleted_media integer := 0;
  v_deleted_media_tag_assignments integer := 0;
  v_deleted_media_tags integer := 0;

  v_deleted_automation_versions integer := 0;
  v_deleted_automation_variables integer := 0;
  v_deleted_automations integer := 0;

  v_deleted_audit_events integer := 0;

  v_counts jsonb;
BEGIN
  SELECT * INTO v_req
  FROM public.data_deletion_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação de exclusão não encontrada';
  END IF;

  v_user_id := v_req.user_id;

  IF v_req.status = 'completed' THEN
    RETURN COALESCE(v_req.metadata, '{}'::jsonb);
  END IF;

  IF v_req.status NOT IN ('approved', 'processing', 'scheduled', 'pending') THEN
    RAISE EXCEPTION 'Status inválido para processamento: %', v_req.status;
  END IF;

  -- Mark processing (DB side)
  UPDATE public.data_deletion_requests
  SET status = 'processing'
  WHERE id = p_request_id;

  -- 4.1) Messages: anonymize content
  UPDATE public.messages
  SET content = '[REMOVIDO]',
      metadata = '{}'::jsonb,
      updated_at = now()
  WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_anonymized_messages = ROW_COUNT;

  -- 4.2) Contacts: anonymize PII but keep rows to preserve FK integrity
  UPDATE public.contacts
  SET name = '[REMOVIDO]',
      phone = NULL,
      email = NULL,
      tags = '{}'::text[],
      custom_fields = '{}'::jsonb,
      status = 'deleted',
      updated_at = now()
  WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_anonymized_contacts = ROW_COUNT;

  -- 4.3) Webhooks + related
  -- Delete children first
  DELETE FROM public.webhook_logs wl
  USING public.webhooks w
  WHERE wl.webhook_id = w.id
    AND w.user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_webhook_logs = ROW_COUNT;

  DELETE FROM public.webhook_conditions wc
  USING public.webhooks w
  WHERE wc.webhook_id = w.id
    AND w.user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_webhook_conditions = ROW_COUNT;

  DELETE FROM public.webhook_retry_queue wrq
  USING public.webhooks w
  WHERE wrq.webhook_id = w.id
    AND w.user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_webhook_retry_queue = ROW_COUNT;

  DELETE FROM public.webhook_retry_config wrc
  USING public.webhooks w
  WHERE wrc.webhook_id = w.id
    AND w.user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_webhook_retry_config = ROW_COUNT;

  DELETE FROM public.webhook_circuit_breaker wcb
  USING public.webhooks w
  WHERE wcb.webhook_id = w.id
    AND w.user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_webhook_circuit = ROW_COUNT;

  DELETE FROM public.webhook_rate_limit wrl
  USING public.webhooks w
  WHERE wrl.webhook_id = w.id
    AND w.user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_webhook_rate_limit = ROW_COUNT;

  DELETE FROM public.webhooks
  WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_webhooks = ROW_COUNT;

  -- 4.4) Media tables (storage is deleted in Edge Function)
  DELETE FROM public.media_tag_assignments mta
  USING public.media_library ml
  WHERE mta.media_id = ml.id
    AND ml.user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_media_tag_assignments = ROW_COUNT;

  DELETE FROM public.media_library
  WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_media = ROW_COUNT;

  DELETE FROM public.media_tags
  WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_media_tags = ROW_COUNT;

  -- 4.5) Automations
  DELETE FROM public.automation_versions av
  USING public.automations a
  WHERE av.automation_id = a.id
    AND a.user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_automation_versions = ROW_COUNT;

  DELETE FROM public.automation_variables v
  USING public.automations a
  WHERE v.automation_id = a.id
    AND a.user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_automation_variables = ROW_COUNT;

  DELETE FROM public.automations
  WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_automations = ROW_COUNT;

  -- 4.6) Optional: audit events (remove history or keep)
  -- Here: keep audit history for security/compliance; do NOT delete.
  v_deleted_audit_events := 0;

  -- 4.7) Soft delete profile
  UPDATE public.profiles
  SET is_deleted = true,
      deleted_at = now(),
      updated_at = now(),
      email = ('deleted+' || v_user_id::text || '@example.invalid')
  WHERE user_id = v_user_id;

  v_counts := jsonb_build_object(
    'request_id', p_request_id,
    'user_id', v_user_id,
    'anonymized_messages', v_anonymized_messages,
    'anonymized_contacts', v_anonymized_contacts,
    'deleted_webhooks', v_deleted_webhooks,
    'deleted_webhook_logs', v_deleted_webhook_logs,
    'deleted_webhook_conditions', v_deleted_webhook_conditions,
    'deleted_webhook_retry_queue', v_deleted_webhook_retry_queue,
    'deleted_webhook_retry_config', v_deleted_webhook_retry_config,
    'deleted_webhook_circuit_breaker', v_deleted_webhook_circuit,
    'deleted_webhook_rate_limit', v_deleted_webhook_rate_limit,
    'deleted_media', v_deleted_media,
    'deleted_media_tag_assignments', v_deleted_media_tag_assignments,
    'deleted_media_tags', v_deleted_media_tags,
    'deleted_automations', v_deleted_automations,
    'deleted_automation_versions', v_deleted_automation_versions,
    'deleted_automation_variables', v_deleted_automation_variables,
    'deleted_audit_events', v_deleted_audit_events,
    'completed_at', now()
  );

  -- 4.8) Mark request completed
  UPDATE public.data_deletion_requests
  SET status = 'completed',
      completed_at = now(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('summary', v_counts)
  WHERE id = p_request_id;

  -- 4.9) Audit
  INSERT INTO public.audit_events (user_id, action, entity_type, metadata)
  VALUES (
    v_user_id,
    'data_deletion_completed',
    'user',
    jsonb_build_object('request_id', p_request_id, 'items_deleted', v_counts)
  );

  RETURN v_counts;
END;
$$;


ALTER FUNCTION "public"."process_data_deletion"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_retry_result"("p_retry_id" "uuid", "p_success" boolean, "p_status_code" integer DEFAULT NULL::integer, "p_error_message" "text" DEFAULT NULL::"text", "p_response_body" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_retry public.webhook_retry_queue%ROWTYPE;
  v_config public.webhook_retry_config%ROWTYPE;
  v_next_retry TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_retry
  FROM public.webhook_retry_queue
  WHERE id = p_retry_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT * INTO v_config
  FROM public.webhook_retry_config
  WHERE webhook_id = v_retry.webhook_id;

  IF p_success THEN
    UPDATE public.webhook_retry_queue
    SET status = 'succeeded',
        last_error = NULL,
        updated_at = NOW()
    WHERE id = p_retry_id;

    IF v_retry.webhook_log_id IS NOT NULL THEN
      UPDATE public.webhook_logs
      SET
        response_status = p_status_code,
        response_body = p_response_body,
        error_message = NULL,
        success = TRUE,
        attempt_number = v_retry.attempt_number,
        executed_at = NOW()
      WHERE id = v_retry.webhook_log_id;
    END IF;

    RETURN;
  END IF;

  -- failure
  IF v_retry.attempt_number >= v_retry.max_attempts THEN
    UPDATE public.webhook_retry_queue
    SET status = 'exhausted',
        last_error = p_error_message,
        updated_at = NOW()
    WHERE id = p_retry_id;

    IF v_retry.webhook_log_id IS NOT NULL THEN
      UPDATE public.webhook_logs
      SET
        response_status = p_status_code,
        response_body = p_response_body,
        error_message = COALESCE(p_error_message, 'Retry exhausted'),
        success = FALSE,
        attempt_number = v_retry.attempt_number,
        executed_at = NOW()
      WHERE id = v_retry.webhook_log_id;
    END IF;

    RETURN;
  END IF;

  IF p_status_code IS NOT NULL AND p_status_code = ANY(v_config.stop_on_status_codes) THEN
    UPDATE public.webhook_retry_queue
    SET status = 'failed',
        last_error = p_error_message,
        updated_at = NOW()
    WHERE id = p_retry_id;

    IF v_retry.webhook_log_id IS NOT NULL THEN
      UPDATE public.webhook_logs
      SET
        response_status = p_status_code,
        response_body = p_response_body,
        error_message = COALESCE(p_error_message, 'Permanent error'),
        success = FALSE,
        attempt_number = v_retry.attempt_number,
        executed_at = NOW()
      WHERE id = v_retry.webhook_log_id;
    END IF;

    RETURN;
  END IF;

  v_next_retry := public.calculate_next_retry(
    v_retry.attempt_number + 1,
    v_config.initial_delay_seconds,
    v_config.max_delay_seconds,
    v_config.backoff_multiplier
  );

  UPDATE public.webhook_retry_queue
  SET status = 'pending',
      attempt_number = attempt_number + 1,
      next_retry_at = v_next_retry,
      last_error = p_error_message,
      updated_at = NOW()
  WHERE id = p_retry_id;

  IF v_retry.webhook_log_id IS NOT NULL THEN
    UPDATE public.webhook_logs
    SET
      response_status = p_status_code,
      response_body = p_response_body,
      error_message = p_error_message,
      success = FALSE,
      attempt_number = v_retry.attempt_number,
      executed_at = NOW()
    WHERE id = v_retry.webhook_log_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."process_retry_result"("p_retry_id" "uuid", "p_success" boolean, "p_status_code" integer, "p_error_message" "text", "p_response_body" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."publish_automation_version"("p_automation_id" "uuid", "p_version_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_old_version_id UUID;
  v_doc JSONB;
BEGIN
  IF NOT public.check_permission('automations.publish'::public.permission_type) THEN
    RAISE EXCEPTION 'Sem permissão para publicar automações';
  END IF;

  -- Ensure caller owns the automation
  IF NOT EXISTS (
    SELECT 1
    FROM public.automations a
    WHERE a.id = p_automation_id
      AND a.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem acesso à automação';
  END IF;

  -- Ensure version belongs to automation and fetch doc
  SELECT av.doc
    INTO v_doc
  FROM public.automation_versions av
  WHERE av.id = p_version_id
    AND av.automation_id = p_automation_id;

  IF v_doc IS NULL THEN
    RAISE EXCEPTION 'Versão não encontrada para esta automação';
  END IF;

  SELECT id INTO v_old_version_id
  FROM public.automation_versions
  WHERE automation_id = p_automation_id
    AND is_current = TRUE
  LIMIT 1;

  IF v_old_version_id IS NOT NULL THEN
    UPDATE public.automation_versions
    SET is_current = FALSE
    WHERE id = v_old_version_id;
  END IF;

  UPDATE public.automation_versions
  SET
    is_current = TRUE,
    published_at = NOW(),
    published_by = auth.uid()
  WHERE id = p_version_id;

  -- Update main automation doc + status
  UPDATE public.automations
  SET
    doc = v_doc,
    updated_at = NOW(),
    status = 'active'
  WHERE id = p_automation_id
    AND user_id = auth.uid();

  PERFORM public.log_audit_event(
    'automation.version_published',
    'automation',
    p_automation_id,
    jsonb_build_object(
      'new_version_id', p_version_id,
      'old_version_id', v_old_version_id
    )
  );
END;
$$;


ALTER FUNCTION "public"."publish_automation_version"("p_automation_id" "uuid", "p_version_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purge_dead_webhook_jobs"("p_older_than_days" integer DEFAULT 30) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.webhook_jobs
  WHERE status = 'dead'
    AND created_at < now() - (LEAST(GREATEST(p_older_than_days, 1), 365) || ' days')::interval;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."purge_dead_webhook_jobs"("p_older_than_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purge_expired_webhook_signature_nonces"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.webhook_signature_nonces
  WHERE expires_at <= now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."purge_expired_webhook_signature_nonces"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recompute_template_rating_avg"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_template_id uuid;
BEGIN
  v_template_id := COALESCE(NEW.template_id, OLD.template_id);

  UPDATE public.automation_templates t
  SET rating_avg = sub.avg_rating
  FROM (
    SELECT template_id, ROUND(AVG(rating)::numeric, 2) AS avg_rating
    FROM public.template_ratings
    WHERE template_id = v_template_id
    GROUP BY template_id
  ) sub
  WHERE t.id = v_template_id;

  -- Se não houver mais ratings, zera rating_avg
  UPDATE public.automation_templates
  SET rating_avg = NULL
  WHERE id = v_template_id
    AND NOT EXISTS (SELECT 1 FROM public.template_ratings r WHERE r.template_id = v_template_id);

  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."recompute_template_rating_avg"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_consent"("p_consent_type" "text", "p_policy_version" "text", "p_granted" boolean) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  consent_id UUID;
BEGIN
  INSERT INTO public.consent_history (
    user_id,
    consent_type,
    policy_version,
    granted,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    auth.uid(),
    p_consent_type,
    p_policy_version,
    p_granted,
    inet_client_addr(),
    current_setting('request.header.user-agent', true),
    jsonb_build_object('timestamp', NOW())
  )
  RETURNING id INTO consent_id;

  RETURN consent_id;
END;
$$;


ALTER FUNCTION "public"."record_consent"("p_consent_type" "text", "p_policy_version" "text", "p_granted" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_webhook_execution"("p_webhook_id" "uuid", "p_success" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_config RECORD;
  v_breaker RECORD;
BEGIN
  SELECT * INTO v_config FROM public.circuit_breaker_config LIMIT 1;
  SELECT * INTO v_breaker FROM public.webhook_circuit_breaker WHERE webhook_id = p_webhook_id;

  IF p_success THEN
    -- SUCESSO
    IF v_breaker.state = 'closed' THEN
      -- Resetar contador de falhas
      UPDATE public.webhook_circuit_breaker
      SET 
        consecutive_failures = 0,
        last_success_at = NOW(),
        success_count = success_count + 1
      WHERE webhook_id = p_webhook_id;

    ELSIF v_breaker.state = 'half_open' THEN
      -- Incrementar sucessos consecutivos
      UPDATE public.webhook_circuit_breaker
      SET 
        consecutive_successes = consecutive_successes + 1,
        consecutive_failures = 0,
        last_success_at = NOW(),
        success_count = success_count + 1
      WHERE webhook_id = p_webhook_id;

      -- Se atingiu threshold, fechar circuit
      IF v_breaker.consecutive_successes + 1 >= v_config.success_threshold THEN
        UPDATE public.webhook_circuit_breaker
        SET 
          state = 'closed',
          consecutive_successes = 0
        WHERE webhook_id = p_webhook_id;
      END IF;
    END IF;

  ELSE
    -- FALHA
    UPDATE public.webhook_circuit_breaker
    SET 
      consecutive_failures = consecutive_failures + 1,
      consecutive_successes = 0,
      last_failure_at = NOW(),
      failure_count = failure_count + 1
    WHERE webhook_id = p_webhook_id;

    -- Se atingiu threshold, abrir circuit
    IF v_breaker.consecutive_failures + 1 >= v_config.failure_threshold THEN
      UPDATE public.webhook_circuit_breaker
      SET 
        state = 'open',
        opened_at = NOW()
      WHERE webhook_id = p_webhook_id;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION "public"."record_webhook_execution"("p_webhook_id" "uuid", "p_success" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_materialized_views"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.webhook_stats_by_user;
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.storage_stats_by_user;
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.automation_performance;
END;
$$;


ALTER FUNCTION "public"."refresh_materialized_views"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_media_analytics"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.media_analytics_summary;
END;
$$;


ALTER FUNCTION "public"."refresh_media_analytics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_webhook_analytics"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.webhook_analytics_summary;
END;
$$;


ALTER FUNCTION "public"."refresh_webhook_analytics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_tag_from_media"("p_media_id" "uuid", "p_tag_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Ensure user owns the media
  IF NOT EXISTS (
    SELECT 1
    FROM public.media_library ml
    WHERE ml.id = p_media_id
      AND ml.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem permissão para remover tag';
  END IF;

  DELETE FROM public.media_tag_assignments
  WHERE media_id = p_media_id
    AND tag_id = p_tag_id;
END;
$$;


ALTER FUNCTION "public"."remove_tag_from_media"("p_media_id" "uuid", "p_tag_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_account_deletion"("p_reason" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  request_id UUID;
  scheduled_date TIMESTAMPTZ;
BEGIN
  scheduled_date := NOW() + INTERVAL '30 days';

  INSERT INTO public.data_deletion_requests (
    user_id,
    reason,
    scheduled_for,
    status
  ) VALUES (
    auth.uid(),
    p_reason,
    scheduled_date,
    'scheduled'
  )
  RETURNING id INTO request_id;

  PERFORM public.log_audit_event(
    'data.deletion_requested',
    'deletion',
    request_id,
    jsonb_build_object('scheduled_for', scheduled_date)
  );

  RETURN request_id;
END;
$$;


ALTER FUNCTION "public"."request_account_deletion"("p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_data_export"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  request_id UUID;
  pending_count INT;
BEGIN
  SELECT COUNT(*) INTO pending_count
  FROM public.data_export_requests
  WHERE user_id = auth.uid()
    AND status IN ('pending', 'processing')
    AND requested_at > NOW() - INTERVAL '24 hours';

  IF pending_count > 0 THEN
    RAISE EXCEPTION 'Você já possui uma solicitação de exportação pendente';
  END IF;

  INSERT INTO public.data_export_requests (user_id, status)
  VALUES (auth.uid(), 'pending')
  RETURNING id INTO request_id;

  PERFORM public.log_audit_event(
    'data.export_requested',
    'export',
    request_id
  );

  -- Optional: notify external worker
  PERFORM pg_notify('data_export_requested', request_id::text);

  RETURN request_id;
END;
$$;


ALTER FUNCTION "public"."request_data_export"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_all_consents"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_types text[] := ARRAY['analytics','marketing','third_party'];
  v_t text;
  v_revoked integer := 0;
  v_last_id uuid;
BEGIN
  FOREACH v_t IN ARRAY v_types LOOP
    v_last_id := public.update_user_consent(v_t, false, jsonb_build_object('reason','bulk_revoke'));
    v_revoked := v_revoked + 1;
  END LOOP;

  RETURN jsonb_build_object('revoked', v_revoked);
END;
$$;


ALTER FUNCTION "public"."revoke_all_consents"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rollback_automation_version"("p_automation_id" "uuid", "p_target_version_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_new_version_id UUID;
  v_target_doc JSONB;
  v_target_version_number INT;
BEGIN
  IF NOT public.check_permission('automations.edit'::public.permission_type) THEN
    RAISE EXCEPTION 'Sem permissão para editar automações';
  END IF;

  -- Ensure caller owns the automation
  IF NOT EXISTS (
    SELECT 1
    FROM public.automations a
    WHERE a.id = p_automation_id
      AND a.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem acesso à automação';
  END IF;

  SELECT doc, version_number
    INTO v_target_doc, v_target_version_number
  FROM public.automation_versions
  WHERE id = p_target_version_id
    AND automation_id = p_automation_id;

  IF v_target_doc IS NULL THEN
    RAISE EXCEPTION 'Versão alvo não encontrada';
  END IF;

  v_new_version_id := public.create_automation_version(
    p_automation_id,
    v_target_doc,
    'Rollback para versão ' || v_target_version_number
  );

  UPDATE public.automation_versions
  SET rollback_from = p_target_version_id
  WHERE id = v_new_version_id;

  PERFORM public.log_audit_event(
    'automation.version_rollback',
    'automation',
    p_automation_id,
    jsonb_build_object(
      'new_version_id', v_new_version_id,
      'rollback_from_version_id', p_target_version_id,
      'rollback_from_version_number', v_target_version_number
    )
  );

  RETURN v_new_version_id;
END;
$$;


ALTER FUNCTION "public"."rollback_automation_version"("p_automation_id" "uuid", "p_target_version_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rotate_due_webhook_secrets"("p_rotation_days" integer DEFAULT 90, "p_grace_days" integer DEFAULT 7) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count integer := 0;
  r record;
  v_new_secret text;
  v_last4 text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  FOR r IN
    SELECT ws.id, ws.user_id, ws.webhook_id
    FROM public.webhook_secrets ws
    WHERE ws.active = true
      AND ws.expires_at <= now()
    FOR UPDATE
  LOOP
    -- deactivate current
    UPDATE public.webhook_secrets
    SET active = false
    WHERE id = r.id;

    -- create next
    v_new_secret := encode(gen_random_bytes(32), 'hex');
    v_last4 := right(v_new_secret, 4);

    INSERT INTO public.webhook_secrets (
      user_id,
      webhook_id,
      encrypted_value,
      secret_last4,
      rotated_at,
      expires_at,
      grace_expires_at,
      active
    ) VALUES (
      r.user_id,
      r.webhook_id,
      public.encrypt_webhook_secret(v_new_secret),
      v_last4,
      now(),
      now() + make_interval(days => GREATEST(p_rotation_days, 1)),
      now() + make_interval(days => GREATEST(p_rotation_days + p_grace_days, 1)),
      true
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."rotate_due_webhook_secrets"("p_rotation_days" integer, "p_grace_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_contacts"("p_query" "text" DEFAULT NULL::"text", "p_tags" "text"[] DEFAULT NULL::"text"[], "p_status" "text" DEFAULT NULL::"text", "p_created_after" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_created_before" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "user_id" "uuid", "name" "text", "phone" "text", "email" "text", "tags" "text"[], "status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "custom_fields" "jsonb", "relevance" real)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.user_id,
    c.name,
    c.phone,
    c.email,
    c.tags,
    c.status,
    c.created_at,
    c.updated_at,
    c.custom_fields,
    CASE
      WHEN p_query IS NOT NULL AND p_query <> '' THEN
        ts_rank(c.search_vector, plainto_tsquery('portuguese', p_query))
      ELSE 0
    END::real AS relevance
  FROM public.contacts c
  WHERE c.user_id = auth.uid()
    AND (
      p_query IS NULL OR p_query = '' OR
      (c.search_vector IS NOT NULL AND c.search_vector @@ plainto_tsquery('portuguese', p_query))
    )
    AND (p_tags IS NULL OR c.tags && p_tags)
    AND (p_status IS NULL OR c.status = p_status)
    AND (p_created_after IS NULL OR c.created_at >= p_created_after)
    AND (p_created_before IS NULL OR c.created_at <= p_created_before)
  ORDER BY
    CASE WHEN p_query IS NOT NULL AND p_query <> '' THEN ts_rank(c.search_vector, plainto_tsquery('portuguese', p_query)) ELSE 0 END DESC,
    c.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 200)
  OFFSET GREATEST(p_offset, 0);
END;
$$;


ALTER FUNCTION "public"."search_contacts"("p_query" "text", "p_tags" "text"[], "p_status" "text", "p_created_after" timestamp with time zone, "p_created_before" timestamp with time zone, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_media"("p_query" "text" DEFAULT NULL::"text", "p_file_types" "text"[] DEFAULT NULL::"text"[], "p_mime_types" "text"[] DEFAULT NULL::"text"[], "p_folder_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_tag_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_min_size" bigint DEFAULT NULL::bigint, "p_max_size" bigint DEFAULT NULL::bigint, "p_date_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_date_to" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "file_name" "text", "file_type" "text", "file_size" bigint, "mime_type" "text", "folder_id" "uuid", "thumbnail_url" "text", "created_at" timestamp with time zone, "match_score" real)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ml.id,
    ml.file_name,
    ml.file_type,
    ml.file_size,
    ml.mime_type,
    ml.folder_id,
    ml.thumbnail_url,
    ml.created_at,
    CASE
      WHEN p_query IS NOT NULL THEN similarity(ml.file_name, p_query)
      ELSE 1.0
    END AS match_score
  FROM public.media_library ml
  WHERE ml.user_id = auth.uid()
    AND (
      p_query IS NULL
      OR ml.file_name ILIKE '%' || p_query || '%'
      OR ml.file_name % p_query
    )
    AND (p_file_types IS NULL OR ml.file_type = ANY(p_file_types))
    AND (p_mime_types IS NULL OR ml.mime_type = ANY(p_mime_types))
    AND (
      p_folder_ids IS NULL
      OR ml.folder_id = ANY(p_folder_ids)
      OR (NULL = ANY(p_folder_ids) AND ml.folder_id IS NULL)
    )
    AND (
      p_tag_ids IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.media_tag_assignments mta
        WHERE mta.media_id = ml.id
          AND mta.tag_id = ANY(p_tag_ids)
      )
    )
    AND (p_min_size IS NULL OR ml.file_size >= p_min_size)
    AND (p_max_size IS NULL OR ml.file_size <= p_max_size)
    AND (p_date_from IS NULL OR ml.created_at >= p_date_from)
    AND (p_date_to IS NULL OR ml.created_at <= p_date_to)
  ORDER BY match_score DESC, ml.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."search_media"("p_query" "text", "p_file_types" "text"[], "p_mime_types" "text"[], "p_folder_ids" "uuid"[], "p_tag_ids" "uuid"[], "p_min_size" bigint, "p_max_size" bigint, "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_webhooks"("p_query" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT NULL::boolean, "p_events" "text"[] DEFAULT NULL::"text"[], "p_has_failures" boolean DEFAULT NULL::boolean, "p_circuit_state" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "name" "text", "url" "text", "is_active" boolean, "events" "text"[], "created_at" timestamp with time zone, "match_score" real)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.name,
    w.url,
    w.is_active,
    w.events,
    w.created_at,
    CASE
      WHEN p_query IS NOT NULL THEN
        GREATEST(similarity(w.name, p_query), similarity(w.url, p_query))
      ELSE 1.0
    END AS match_score
  FROM public.webhooks w
  LEFT JOIN public.webhook_circuit_breaker wcb ON w.id = wcb.webhook_id
  WHERE w.user_id = auth.uid()
    AND (
      p_query IS NULL
      OR w.name ILIKE '%' || p_query || '%'
      OR w.url ILIKE '%' || p_query || '%'
      OR w.name % p_query
      OR w.url % p_query
    )
    AND (p_is_active IS NULL OR w.is_active = p_is_active)
    AND (
      p_events IS NULL
      OR w.events && p_events
    )
    AND (
      p_has_failures IS NULL
      OR (
        p_has_failures = true AND EXISTS (
          SELECT 1
          FROM public.webhook_logs wl
          WHERE wl.webhook_id = w.id
            AND COALESCE(wl.executed_at, now()) >= NOW() - INTERVAL '24 hours'
            AND (COALESCE(wl.response_status, 0) >= 400 OR wl.error_message IS NOT NULL)
        )
      )
      OR (
        p_has_failures = false AND NOT EXISTS (
          SELECT 1
          FROM public.webhook_logs wl
          WHERE wl.webhook_id = w.id
            AND COALESCE(wl.executed_at, now()) >= NOW() - INTERVAL '24 hours'
            AND (COALESCE(wl.response_status, 0) >= 400 OR wl.error_message IS NOT NULL)
        )
      )
    )
    AND (p_circuit_state IS NULL OR wcb.state::TEXT = p_circuit_state)
  ORDER BY match_score DESC, w.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."search_webhooks"("p_query" "text", "p_is_active" boolean, "p_events" "text"[], "p_has_failures" boolean, "p_circuit_state" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_analytics_event"("p_event_type" "text", "p_properties" "jsonb" DEFAULT '{}'::"jsonb", "p_session_id" "text" DEFAULT NULL::"text", "p_automation_id" "uuid" DEFAULT NULL::"uuid", "p_contact_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.analytics_events (
    user_id,
    event_type,
    event_properties,
    session_id,
    automation_id,
    contact_id
  ) VALUES (
    auth.uid(),
    p_event_type,
    COALESCE(p_properties, '{}'::jsonb),
    p_session_id,
    p_automation_id,
    p_contact_id
  )
  RETURNING id INTO event_id;

  RETURN event_id;
END;
$$;


ALTER FUNCTION "public"."track_analytics_event"("p_event_type" "text", "p_properties" "jsonb", "p_session_id" "text", "p_automation_id" "uuid", "p_contact_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_analytics_event"("p_event_type" "text", "p_properties" "jsonb" DEFAULT '{}'::"jsonb", "p_session_id" "text" DEFAULT NULL::"text", "p_automation_id" "uuid" DEFAULT NULL::"uuid", "p_contact_id" "uuid" DEFAULT NULL::"uuid", "p_workspace_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'workspace_id is required';
  END IF;

  IF NOT public.is_workspace_member(p_workspace_id, v_user_id) THEN
    RAISE EXCEPTION 'Not a workspace member';
  END IF;

  INSERT INTO public.analytics_events (
    user_id,
    workspace_id,
    event_type,
    event_properties,
    session_id,
    automation_id,
    contact_id
  )
  VALUES (
    v_user_id,
    p_workspace_id,
    p_event_type,
    COALESCE(p_properties, '{}'::jsonb),
    p_session_id,
    p_automation_id,
    p_contact_id
  );
END;
$$;


ALTER FUNCTION "public"."track_analytics_event"("p_event_type" "text", "p_properties" "jsonb", "p_session_id" "text", "p_automation_id" "uuid", "p_contact_id" "uuid", "p_workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_normalize_phone"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.phone := normalize_phone(NEW.phone);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_normalize_phone"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_webhook"("p_webhook_id" "uuid", "p_event_type" "text", "p_payload" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.webhook_logs (
    webhook_id,
    event_type,
    payload,
    attempt_number
  ) VALUES (
    p_webhook_id,
    p_event_type,
    p_payload,
    1
  ) RETURNING id INTO log_id;

  PERFORM pg_notify('webhook_trigger', json_build_object(
    'log_id', log_id,
    'webhook_id', p_webhook_id
  )::text);

  RETURN log_id;
END;
$$;


ALTER FUNCTION "public"."trigger_webhook"("p_webhook_id" "uuid", "p_event_type" "text", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_storage_quota"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_user_id := NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  ELSE
    RETURN NULL;
  END IF;

  PERFORM public.ensure_user_storage_quota(v_user_id);

  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_storage_quotas
    SET
      total_size_bytes = total_size_bytes + COALESCE(NEW.file_size, 0),
      file_count = file_count + 1
    WHERE user_id = v_user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_storage_quotas
    SET
      total_size_bytes = GREATEST(total_size_bytes - COALESCE(OLD.file_size, 0), 0),
      file_count = GREATEST(file_count - 1, 0)
    WHERE user_id = v_user_id;
  END IF;

  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_storage_quota"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_consent"("p_consent_type" "text", "p_granted" boolean, "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.is_allowed_consent_type(p_consent_type) THEN
    RAISE EXCEPTION 'Tipo de consentimento inválido';
  END IF;

  INSERT INTO public.user_consents (
    user_id,
    consent_type,
    granted,
    granted_at,
    revoked_at,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    auth.uid(),
    p_consent_type,
    p_granted,
    CASE WHEN p_granted THEN now() ELSE NULL END,
    CASE WHEN NOT p_granted THEN now() ELSE NULL END,
    inet_client_addr()::text,
    current_setting('request.header.user-agent', true),
    COALESCE(p_metadata, '{}'::jsonb)
  ) RETURNING id INTO v_id;

  PERFORM public.log_audit_event(
    'consent.updated',
    'consent',
    v_id,
    jsonb_build_object('consent_type', p_consent_type, 'granted', p_granted)
  );

  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."update_user_consent"("p_consent_type" "text", "p_granted" boolean, "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_whatsapp_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_whatsapp_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_cloud_integration_tokens"("p_provider" "public"."cloud_provider", "p_access_token" "text", "p_refresh_token" "text", "p_expires_at" timestamp with time zone, "p_folder_id" "text", "p_folder_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'vault'
    AS $$
DECLARE
  v_user_id UUID;
  v_existing public.cloud_integrations;
  v_access_id UUID;
  v_refresh_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_existing
  FROM public.cloud_integrations
  WHERE user_id = v_user_id AND provider = p_provider;

  IF FOUND THEN
    -- Update existing Vault secrets
    PERFORM vault.update_secret(v_existing.access_token_secret_id, p_access_token, 'cloud_access_token', 'Cloud access token');
    v_access_id := v_existing.access_token_secret_id;

    IF p_refresh_token IS NOT NULL AND length(p_refresh_token) > 0 THEN
      IF v_existing.refresh_token_secret_id IS NULL THEN
        v_refresh_id := vault.create_secret(p_refresh_token, 'cloud_refresh_token', 'Cloud refresh token');
      ELSE
        PERFORM vault.update_secret(v_existing.refresh_token_secret_id, p_refresh_token, 'cloud_refresh_token', 'Cloud refresh token');
        v_refresh_id := v_existing.refresh_token_secret_id;
      END IF;
    ELSE
      v_refresh_id := v_existing.refresh_token_secret_id;
    END IF;

    UPDATE public.cloud_integrations
    SET
      refresh_token_secret_id = v_refresh_id,
      expires_at = p_expires_at,
      folder_id = p_folder_id,
      folder_name = p_folder_name
    WHERE id = v_existing.id;

    RETURN v_existing.id;
  END IF;

  -- Create new Vault secrets
  v_access_id := vault.create_secret(p_access_token, 'cloud_access_token', 'Cloud access token');

  IF p_refresh_token IS NOT NULL AND length(p_refresh_token) > 0 THEN
    v_refresh_id := vault.create_secret(p_refresh_token, 'cloud_refresh_token', 'Cloud refresh token');
  ELSE
    v_refresh_id := NULL;
  END IF;

  INSERT INTO public.cloud_integrations (
    user_id, provider,
    access_token_secret_id, refresh_token_secret_id,
    expires_at, folder_id, folder_name
  ) VALUES (
    v_user_id, p_provider,
    v_access_id, v_refresh_id,
    p_expires_at, p_folder_id, p_folder_name
  )
  RETURNING id INTO v_access_id;

  RETURN v_access_id;
END;
$$;


ALTER FUNCTION "public"."upsert_cloud_integration_tokens"("p_provider" "public"."cloud_provider", "p_access_token" "text", "p_refresh_token" "text", "p_expires_at" timestamp with time zone, "p_folder_id" "text", "p_folder_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_contact_from_whatsapp"("p_workspace_id" "uuid", "p_phone" "text", "p_name" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_contact_id uuid;
  v_role text;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);
  IF v_role IS DISTINCT FROM 'service_role' AND v_role IS DISTINCT FROM 'supabase_admin' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Find existing contact by (workspace_id, phone)
  SELECT c.id INTO v_contact_id
  FROM public.contacts c
  WHERE c.workspace_id = p_workspace_id
    AND c.phone = p_phone
  LIMIT 1;

  IF v_contact_id IS NULL THEN
    INSERT INTO public.contacts (workspace_id, user_id, phone, name)
    VALUES (
      p_workspace_id,
      -- Fallback: keep compatibility where contacts require user_id; caller should set claims.sub when possible.
      COALESCE(NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid, gen_random_uuid()),
      p_phone,
      COALESCE(p_name, 'Contato ' || left(p_phone, 8))
    )
    RETURNING id INTO v_contact_id;
  ELSE
    UPDATE public.contacts
    SET name = COALESCE(p_name, name),
        updated_at = now()
    WHERE id = v_contact_id;
  END IF;

  RETURN v_contact_id;
END;
$$;


ALTER FUNCTION "public"."upsert_contact_from_whatsapp"("p_workspace_id" "uuid", "p_phone" "text", "p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_whatsapp_conversation"("p_whatsapp_instance_id" "uuid", "p_workspace_id" "uuid", "p_contact_id" "uuid", "p_last_message_content" "text", "p_last_message_from_me" boolean) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_conversation_id uuid;
  v_role text;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);
  IF v_role IS DISTINCT FROM 'service_role' AND v_role IS DISTINCT FROM 'supabase_admin' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.whatsapp_conversations (
    whatsapp_instance_id,
    workspace_id,
    contact_id,
    last_message_content,
    last_message_at,
    last_message_from_me,
    unread_count
  ) VALUES (
    p_whatsapp_instance_id,
    p_workspace_id,
    p_contact_id,
    p_last_message_content,
    now(),
    p_last_message_from_me,
    CASE WHEN p_last_message_from_me THEN 0 ELSE 1 END
  )
  ON CONFLICT (whatsapp_instance_id, contact_id)
  DO UPDATE SET
    last_message_content = EXCLUDED.last_message_content,
    last_message_at = EXCLUDED.last_message_at,
    last_message_from_me = EXCLUDED.last_message_from_me,
    unread_count = CASE
      WHEN EXCLUDED.last_message_from_me THEN public.whatsapp_conversations.unread_count
      ELSE public.whatsapp_conversations.unread_count + 1
    END,
    updated_at = now()
  RETURNING id INTO v_conversation_id;

  RETURN v_conversation_id;
END;
$$;


ALTER FUNCTION "public"."upsert_whatsapp_conversation"("p_whatsapp_instance_id" "uuid", "p_workspace_id" "uuid", "p_contact_id" "uuid", "p_last_message_content" "text", "p_last_message_from_me" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."use_saved_search"("p_search_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.saved_searches
  SET
    last_used_at = NOW(),
    use_count = use_count + 1,
    updated_at = NOW()
  WHERE id = p_search_id
    AND user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."use_saved_search"("p_search_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_contacts_ai_review_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.ai_review_status IS NULL OR NEW.ai_review_status = '' THEN
    NEW.ai_review_status := 'pending';
  END IF;

  IF NEW.ai_review_status NOT IN ('pending', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid ai_review_status: %', NEW.ai_review_status;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_contacts_ai_review_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_invitation_expires_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'expires_at must be in the future';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_invitation_expires_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."workspace_has_permission"("p_workspace_id" "uuid", "p_permission" "text", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  r text;
  perm text;
begin
  perm := public.normalize_permission_name(p_permission);
  r := public.workspace_user_role(p_workspace_id, p_user_id);

  if r is null then
    return false;
  end if;

  if r = 'owner' then
    return true;
  end if;

  if r = 'admin' then
    return perm in (
      'workspace.settings.update',
      'members.invite',
      'members.remove',
      'contacts.view',
      'contacts.create',
      'contacts.edit',
      'contacts.delete',
      'automations.view',
      'automations.create',
      'automations.edit',
      'automations.delete',
      'webhooks.view',
      'webhooks.create',
      'webhooks.edit',
      'webhooks.manage',
      'media.view',
      'media.upload',
      'media.manage',
      'analytics.view',
      'analytics.create',
      'whatsapp.view',
      'whatsapp.manage'
    );
  end if;

  if r = 'member' then
    return perm in (
      'contacts.view',
      'contacts.create',
      'contacts.edit',
      'automations.view',
      'automations.create',
      'automations.edit',
      'webhooks.view',
      'webhooks.create',
      'webhooks.edit',
      'media.view',
      'media.upload',
      'analytics.view',
      'analytics.create',
      'whatsapp.view',
      'whatsapp.manage'
    );
  end if;

  if r = 'viewer' then
    return perm in (
      'contacts.view',
      'automations.view',
      'webhooks.view',
      'media.view',
      'analytics.view',
      'whatsapp.view'
    );
  end if;

  return false;
end;
$$;


ALTER FUNCTION "public"."workspace_has_permission"("p_workspace_id" "uuid", "p_permission" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."workspace_user_role"("p_workspace_id" "uuid", "p_user_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT wm.role
  FROM public.workspace_members wm
  WHERE wm.workspace_id = p_workspace_id
    AND wm.user_id = p_user_id
  LIMIT 1;
$$;


ALTER FUNCTION "public"."workspace_user_role"("p_workspace_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_properties" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "session_id" "text",
    "automation_id" "uuid",
    "contact_id" "uuid",
    "workspace_id" "uuid"
);


ALTER TABLE "public"."analytics_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."automations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "public"."automation_status" DEFAULT 'draft'::"public"."automation_status" NOT NULL,
    "trigger" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "global_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "tags_library" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "doc" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "workspace_id" "uuid",
    "yjs_state" "bytea"
);


ALTER TABLE "public"."automations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."automation_metrics" WITH ("security_invoker"='on') AS
 SELECT "id" AS "automation_id",
    "user_id",
    "name",
    "status",
    "created_at",
    COALESCE(( SELECT "count"(*) AS "count"
           FROM "public"."analytics_events" "e"
          WHERE (("e"."automation_id" = "a"."id") AND ("e"."event_type" = 'message.sent'::"text"))), (0)::bigint) AS "messages_sent",
    COALESCE(( SELECT "count"(*) AS "count"
           FROM "public"."analytics_events" "e"
          WHERE (("e"."automation_id" = "a"."id") AND ("e"."event_type" = 'message.delivered'::"text"))), (0)::bigint) AS "messages_delivered",
    COALESCE(( SELECT "count"(*) AS "count"
           FROM "public"."analytics_events" "e"
          WHERE (("e"."automation_id" = "a"."id") AND ("e"."event_type" = 'message.read'::"text"))), (0)::bigint) AS "messages_read",
    COALESCE(( SELECT "count"(*) AS "count"
           FROM "public"."analytics_events" "e"
          WHERE (("e"."automation_id" = "a"."id") AND ("e"."event_type" = 'message.replied'::"text"))), (0)::bigint) AS "messages_replied",
    COALESCE(( SELECT "count"(*) AS "count"
           FROM "public"."analytics_events" "e"
          WHERE (("e"."automation_id" = "a"."id") AND ("e"."event_type" = 'message.failed'::"text"))), (0)::bigint) AS "messages_failed",
    COALESCE(( SELECT "count"(DISTINCT "e"."contact_id") AS "count"
           FROM "public"."analytics_events" "e"
          WHERE (("e"."automation_id" = "a"."id") AND ("e"."contact_id" IS NOT NULL))), (0)::bigint) AS "unique_contacts_reached",
    ( SELECT "max"("e"."created_at") AS "max"
           FROM "public"."analytics_events" "e"
          WHERE ("e"."automation_id" = "a"."id")) AS "last_activity_at"
   FROM "public"."automations" "a";


ALTER VIEW "public"."automation_metrics" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "private"."automation_performance" AS
 SELECT "automation_id",
    "user_id",
    "name",
    "status",
    "last_activity_at",
    "messages_sent",
    "messages_delivered",
    "messages_read",
    "messages_replied",
    "messages_failed",
    "unique_contacts_reached"
   FROM "public"."automation_metrics" "am"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "private"."automation_performance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_library" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "mime_type" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "public_url" "text" NOT NULL,
    "thumbnail_url" "text",
    "width" integer,
    "height" integer,
    "duration" integer,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "folder_id" "uuid",
    "workspace_id" "uuid"
);


ALTER TABLE "public"."media_library" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "private"."storage_stats_by_user" AS
 SELECT "user_id",
    "count"(*) AS "total_files",
    COALESCE("sum"("file_size"), (0)::numeric) AS "total_size_bytes",
    (((COALESCE("sum"("file_size"), (0)::numeric) / 1024.0) / 1024.0) / 1024.0) AS "total_size_gb",
    "count"(
        CASE
            WHEN ("mime_type" ~~ 'image/%'::"text") THEN 1
            ELSE NULL::integer
        END) AS "image_count",
    "count"(
        CASE
            WHEN ("mime_type" ~~ 'video/%'::"text") THEN 1
            ELSE NULL::integer
        END) AS "video_count",
    "count"(
        CASE
            WHEN ("mime_type" ~~ 'audio/%'::"text") THEN 1
            ELSE NULL::integer
        END) AS "audio_count",
    "max"("created_at") AS "last_upload"
   FROM "public"."media_library"
  GROUP BY "user_id"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "private"."storage_stats_by_user" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "private"."webhook_stats_by_user" AS
 SELECT "w"."user_id",
    "count"(DISTINCT "w"."id") AS "total_webhooks",
    "count"(DISTINCT
        CASE
            WHEN "w"."is_active" THEN "w"."id"
            ELSE NULL::"uuid"
        END) AS "active_webhooks",
    "count"("wl"."id") AS "total_executions",
    "count"(
        CASE
            WHEN ("wl"."success" = true) THEN 1
            ELSE NULL::integer
        END) AS "successful_executions",
    "count"(
        CASE
            WHEN ("wl"."success" = false) THEN 1
            ELSE NULL::integer
        END) AS "failed_executions",
    "percentile_cont"((0.95)::double precision) WITHIN GROUP (ORDER BY (("wl"."duration_ms")::double precision)) AS "p95_latency",
    "avg"("wl"."duration_ms") AS "avg_latency",
    "max"("wl"."executed_at") AS "last_execution"
   FROM ("public"."webhooks" "w"
     LEFT JOIN "public"."webhook_logs" "wl" ON (("w"."id" = "wl"."webhook_id")))
  GROUP BY "w"."user_id"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "private"."webhook_stats_by_user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alert_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "alert_type" "text" NOT NULL,
    "conditions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "channels" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."alert_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alert_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alert_config_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "triggered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "severity" "text" DEFAULT 'info'::"text" NOT NULL,
    "message" "text" NOT NULL,
    "metadata" "jsonb"
);


ALTER TABLE "public"."alert_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_encryption_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key_name" "text" NOT NULL,
    "key_bytes" "bytea" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."app_encryption_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "session_id" "text",
    "workspace_id" "uuid"
);


ALTER TABLE "public"."audit_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."automation_execution_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workspace_id" "uuid",
    "automation_id" "uuid",
    "status" "text" NOT NULL,
    "duration_ms" integer,
    "error_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."automation_execution_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."automation_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_public" boolean DEFAULT false NOT NULL,
    "configuration" "jsonb" NOT NULL,
    "use_count" integer DEFAULT 0 NOT NULL,
    "rating_avg" numeric(3,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."automation_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."automation_variables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "automation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "var_type" "public"."flow_var_type" NOT NULL,
    "default_value" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."automation_variables" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."automation_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "automation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "label" "text",
    "doc" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version_number" integer NOT NULL,
    "published_at" timestamp with time zone,
    "published_by" "uuid",
    "is_current" boolean DEFAULT false NOT NULL,
    "rollback_from" "uuid",
    "change_summary" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."automation_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."circuit_breaker_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "failure_threshold" integer DEFAULT 5 NOT NULL,
    "success_threshold" integer DEFAULT 2 NOT NULL,
    "open_timeout_seconds" integer DEFAULT 300 NOT NULL,
    "half_open_max_calls" integer DEFAULT 3 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."circuit_breaker_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cleanup_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "public"."retention_entity_type" NOT NULL,
    "workspace_id" "uuid",
    "policy_id" "uuid",
    "deletion_strategy" "public"."retention_deletion_strategy" NOT NULL,
    "cutoff_at" timestamp with time zone NOT NULL,
    "deleted_count" bigint DEFAULT 0 NOT NULL,
    "execution_time_ms" bigint,
    "executed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cleanup_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cleanup_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'completed'::"text" NOT NULL,
    "error_message" "text",
    "deleted_exports_count" integer DEFAULT 0 NOT NULL,
    "deleted_webhook_logs_count" integer DEFAULT 0 NOT NULL,
    "deleted_rate_limit_events_count" integer DEFAULT 0 NOT NULL,
    "deleted_audit_events_count" integer DEFAULT 0 NOT NULL,
    "deleted_orphan_uploads_count" integer DEFAULT 0 NOT NULL,
    "freed_bytes" bigint DEFAULT 0 NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."cleanup_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cloud_integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" "public"."cloud_provider" NOT NULL,
    "access_token_secret_id" "uuid" NOT NULL,
    "refresh_token_secret_id" "uuid",
    "expires_at" timestamp with time zone,
    "folder_id" "text",
    "folder_name" "text",
    "auto_sync_enabled" boolean DEFAULT false NOT NULL,
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cloud_integrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cloud_sync_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "integration_id" "uuid" NOT NULL,
    "sync_type" "text" NOT NULL,
    "status" "public"."sync_status" DEFAULT 'idle'::"public"."sync_status" NOT NULL,
    "files_synced" integer DEFAULT 0 NOT NULL,
    "bytes_synced" bigint DEFAULT 0 NOT NULL,
    "error_message" "text",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."cloud_sync_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consent_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "consent_type" "text" NOT NULL,
    "policy_version" "text" NOT NULL,
    "granted" boolean NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."consent_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "search_vector" "tsvector",
    "workspace_id" "uuid",
    "yjs_state" "bytea",
    "ai_name_suggestion" "text",
    "ai_category_suggestion" "text",
    "ai_tags_suggestion" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "ai_sentiment_suggestion" "text",
    "ai_summary_suggestion" "text",
    "ai_review_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "ai_enriched_at" timestamp with time zone,
    "ai_reviewed_at" timestamp with time zone,
    "profile_picture_url" "text",
    "opt_out" boolean DEFAULT false,
    "opt_out_date" timestamp without time zone
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."contacts"."opt_out" IS 'Cliente pediu para não receber mais mensagens';



COMMENT ON COLUMN "public"."contacts"."opt_out_date" IS 'Data em que pediu opt-out';



CREATE TABLE IF NOT EXISTS "public"."cookie_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "essential" boolean DEFAULT true NOT NULL,
    "analytics" boolean DEFAULT false NOT NULL,
    "marketing" boolean DEFAULT false NOT NULL,
    "functional" boolean DEFAULT false NOT NULL,
    "consent_version" "text" DEFAULT '1'::"text" NOT NULL,
    "decided_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cookie_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_deletion_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scheduled_for" timestamp with time zone NOT NULL,
    "completed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "status" "text" NOT NULL,
    "reason" "text",
    "backup_location" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "error_message" "text",
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "last_attempt_at" timestamp with time zone,
    CONSTRAINT "data_deletion_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'scheduled'::"text", 'processing'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."data_deletion_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_export_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "download_url" "text",
    "file_size_bytes" bigint,
    "status" "text" NOT NULL,
    "error_message" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "file_path" "text",
    CONSTRAINT "data_export_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."data_export_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_retention_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "public"."retention_entity_type" NOT NULL,
    "retention_days" integer NOT NULL,
    "deletion_strategy" "public"."retention_deletion_strategy" DEFAULT 'hard_delete'::"public"."retention_deletion_strategy" NOT NULL,
    "apply_to_workspace_id" "uuid",
    "is_global" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "data_retention_policies_retention_days_positive" CHECK (("retention_days" > 0)),
    CONSTRAINT "data_retention_policies_scope_check" CHECK (((("apply_to_workspace_id" IS NOT NULL) AND ("is_global" = false)) OR (("apply_to_workspace_id" IS NULL) AND ("is_global" = true))))
);


ALTER TABLE "public"."data_retention_policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entity_comment_reads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "last_read_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."entity_comment_reads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entity_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment_text" "text" NOT NULL,
    "parent_comment_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."entity_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."export_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "export_type" "text" NOT NULL,
    "format" "public"."export_format" NOT NULL,
    "status" "public"."export_status" DEFAULT 'pending'::"public"."export_status" NOT NULL,
    "filters" "jsonb",
    "file_url" "text",
    "file_size" bigint,
    "records_count" integer,
    "error_message" "text",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."export_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."immutable_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workspace_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text",
    "entity_id" "uuid",
    "ip_address" "inet",
    "user_agent" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."immutable_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."market_competitor_analyses" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_url" "text" NOT NULL,
    "marketplace" "text" NOT NULL,
    "suggested_price" numeric(12,2) NOT NULL,
    "items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "trend" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "user_id" "uuid",
    CONSTRAINT "market_competitor_analyses_marketplace_check" CHECK (("marketplace" = ANY (ARRAY['mercado_livre'::"text", 'shopee'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."market_competitor_analyses" OWNER TO "postgres";


ALTER TABLE "public"."market_competitor_analyses" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."market_competitor_analyses_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."market_price_alerts" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_url" "text" NOT NULL,
    "marketplace" "text" NOT NULL,
    "previous_price" numeric(12,2) NOT NULL,
    "current_price" numeric(12,2) NOT NULL,
    "percent_change" numeric(8,4) NOT NULL,
    "alert_type" "text" DEFAULT 'price_drop'::"text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "acknowledged_at" timestamp with time zone,
    "user_id" "uuid",
    CONSTRAINT "market_price_alerts_marketplace_check" CHECK (("marketplace" = ANY (ARRAY['mercado_livre'::"text", 'shopee'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."market_price_alerts" OWNER TO "postgres";


ALTER TABLE "public"."market_price_alerts" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."market_price_alerts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."market_usage_daily" (
    "user_id" "uuid" NOT NULL,
    "day" "date" NOT NULL,
    "analyses_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."market_usage_daily" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."market_user_plans" (
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "plan" "text" DEFAULT 'free'::"text" NOT NULL,
    "daily_analysis_limit" integer DEFAULT 10 NOT NULL,
    "watchlist_limit" integer DEFAULT 30 NOT NULL,
    CONSTRAINT "market_user_plans_plan_check" CHECK (("plan" = ANY (ARRAY['free'::"text", 'pro'::"text", 'business'::"text"])))
);


ALTER TABLE "public"."market_user_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."market_watchlist" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_url" "text" NOT NULL,
    "marketplace" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "target_price" numeric(12,2),
    "last_suggested_price" numeric(12,2),
    "user_id" "uuid",
    CONSTRAINT "market_watchlist_marketplace_check" CHECK (("marketplace" = ANY (ARRAY['mercado_livre'::"text", 'shopee'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."market_watchlist" OWNER TO "postgres";


ALTER TABLE "public"."market_watchlist" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."market_watchlist_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE MATERIALIZED VIEW "public"."media_analytics_summary" AS
 SELECT "user_id",
    "count"(*) AS "total_files",
    (COALESCE("sum"("file_size"), (0)::numeric))::bigint AS "total_size_bytes",
    COALESCE("sum"(
        CASE
            WHEN COALESCE((("metadata" ->> 'compressed'::"text"))::boolean, false) THEN 1
            ELSE 0
        END), (0)::bigint) AS "compressed_files",
    (COALESCE("sum"(
        CASE
            WHEN COALESCE((("metadata" ->> 'compressed'::"text"))::boolean, false) THEN GREATEST((COALESCE((NULLIF(("metadata" ->> 'original_size_bytes'::"text"), ''::"text"))::bigint, (0)::bigint) - COALESCE((NULLIF(("metadata" ->> 'compressed_size_bytes'::"text"), ''::"text"))::bigint, (0)::bigint)), (0)::bigint)
            ELSE (0)::bigint
        END), (0)::numeric))::bigint AS "total_savings_bytes",
    "count"(*) FILTER (WHERE ("file_type" = 'image'::"text")) AS "image_count",
    (COALESCE("sum"("file_size") FILTER (WHERE ("file_type" = 'image'::"text")), (0)::numeric))::bigint AS "image_size_bytes",
    "count"(*) FILTER (WHERE ("file_type" = 'video'::"text")) AS "video_count",
    (COALESCE("sum"("file_size") FILTER (WHERE ("file_type" = 'video'::"text")), (0)::numeric))::bigint AS "video_size_bytes",
    "count"(*) FILTER (WHERE ("file_type" = 'document'::"text")) AS "document_count",
    (COALESCE("sum"("file_size") FILTER (WHERE ("file_type" = 'document'::"text")), (0)::numeric))::bigint AS "document_size_bytes",
    "count"(*) FILTER (WHERE ("file_type" = 'audio'::"text")) AS "audio_count",
    (COALESCE("sum"("file_size") FILTER (WHERE ("file_type" = 'audio'::"text")), (0)::numeric))::bigint AS "audio_size_bytes",
    "min"("created_at") AS "first_upload_at",
    "max"("created_at") AS "last_upload_at",
    "max"("updated_at") AS "last_updated_at"
   FROM "public"."media_library" "ml"
  GROUP BY "user_id"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."media_analytics_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "parent_id" "uuid",
    "color" "text" DEFAULT '#6B7280'::"text" NOT NULL,
    "icon" "text",
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "workspace_id" "uuid",
    CONSTRAINT "media_folders_valid_name" CHECK ((("length"("name") >= 1) AND ("length"("name") <= 100)))
);


ALTER TABLE "public"."media_folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_tag_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "media_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."media_tag_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#3B82F6'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "workspace_id" "uuid",
    CONSTRAINT "media_tags_valid_name" CHECK ((("length"("name") >= 1) AND ("length"("name") <= 50)))
);


ALTER TABLE "public"."media_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workspace_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "body" "text" NOT NULL,
    "variables" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."message_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "direction" "text" DEFAULT 'outbound'::"text" NOT NULL,
    "content" "text" NOT NULL,
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "was_delivered" boolean DEFAULT false,
    "was_read" boolean DEFAULT false,
    "received_response" boolean DEFAULT false,
    "was_blocked" boolean DEFAULT false,
    "sent_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "messages_direction_valid" CHECK (("direction" = ANY (ARRAY['inbound'::"text", 'outbound'::"text"]))),
    CONSTRAINT "messages_status_valid" CHECK (("status" = ANY (ARRAY['queued'::"text", 'sent'::"text", 'delivered'::"text", 'read'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."messages"."was_delivered" IS 'Mensagem foi entregue (✓✓)';



COMMENT ON COLUMN "public"."messages"."was_read" IS 'Mensagem foi lida (✓✓ azul)';



COMMENT ON COLUMN "public"."messages"."received_response" IS 'Cliente respondeu esta mensagem';



COMMENT ON COLUMN "public"."messages"."was_blocked" IS 'Cliente bloqueou após esta mensagem';



CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "webhook_failure_enabled" boolean DEFAULT true NOT NULL,
    "webhook_circuit_open_enabled" boolean DEFAULT true NOT NULL,
    "storage_quota_warning_enabled" boolean DEFAULT true NOT NULL,
    "storage_quota_critical_enabled" boolean DEFAULT true NOT NULL,
    "media_processing_complete_enabled" boolean DEFAULT true NOT NULL,
    "media_processing_failed_enabled" boolean DEFAULT true NOT NULL,
    "system_announcement_enabled" boolean DEFAULT true NOT NULL,
    "security_alert_enabled" boolean DEFAULT true NOT NULL,
    "email_notifications_enabled" boolean DEFAULT false NOT NULL,
    "email_digest_frequency" "text" DEFAULT 'daily'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "priority" "public"."notification_priority" DEFAULT 'medium'::"public"."notification_priority" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "action_url" "text",
    "action_label" "text",
    "metadata" "jsonb",
    "read" boolean DEFAULT false NOT NULL,
    "read_at" timestamp with time zone,
    "archived" boolean DEFAULT false NOT NULL,
    "archived_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."onboarding_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "step_id" "text" NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."onboarding_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "policy_type" "text" NOT NULL,
    "version" "text" NOT NULL,
    "content" "text" NOT NULL,
    "effective_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."policy_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limit_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "endpoint" "text" NOT NULL,
    "max_requests" integer DEFAULT 10 NOT NULL,
    "window_seconds" integer DEFAULT 60 NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rate_limit_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limit_counters_v2" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rule_id" "uuid" NOT NULL,
    "identifier" "text" NOT NULL,
    "endpoint" "text" NOT NULL,
    "window_start" timestamp with time zone NOT NULL,
    "request_count" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rate_limit_counters_v2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limit_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "ip_address" "inet",
    "endpoint" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."rate_limit_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limit_rules_v2" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "endpoint" "text" NOT NULL,
    "limit_type" "text" NOT NULL,
    "max_requests" integer NOT NULL,
    "window_seconds" integer NOT NULL,
    "tier" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rate_limit_rules_v2_limit_type_check" CHECK (("limit_type" = ANY (ARRAY['per_user'::"text", 'per_workspace'::"text", 'per_ip'::"text"])))
);


ALTER TABLE "public"."rate_limit_rules_v2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "permission" "public"."permission_type" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saved_searches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "search_type" "text" NOT NULL,
    "filters" "jsonb" NOT NULL,
    "is_favorite" boolean DEFAULT false NOT NULL,
    "last_used_at" timestamp with time zone,
    "use_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."saved_searches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduled_automations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "automation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "schedule_type" "text" NOT NULL,
    "schedule_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "next_run_at" timestamp with time zone,
    "last_run_at" timestamp with time zone,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."scheduled_automations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."signed_url_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "file_path" "text" NOT NULL,
    "signed_url" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."signed_url_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sli_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "domain" "text" NOT NULL,
    "metric_name" "text" NOT NULL,
    "value" numeric NOT NULL,
    "target" numeric NOT NULL,
    "window_start" timestamp with time zone NOT NULL,
    "window_end" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sli_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workspace_id" "uuid",
    "entity_type" "text" NOT NULL,
    "status" "text" NOT NULL,
    "duration_ms" integer,
    "error_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sync_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_installs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "automation_id" "uuid",
    "installed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."template_installs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_ratings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "review" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "template_ratings_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."template_ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trial_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "trial_started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "trial_days" integer DEFAULT 7 NOT NULL,
    "override_unlimited" boolean DEFAULT false NOT NULL,
    "subscribed_until" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trial_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."upload_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workspace_id" "uuid",
    "status" "text" NOT NULL,
    "validation_duration_ms" integer,
    "error_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."upload_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_consents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "consent_type" "text" NOT NULL,
    "granted" boolean NOT NULL,
    "granted_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "ip_address" "text",
    "user_agent" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_consents" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_funnel_metrics" WITH ("security_invoker"='true') AS
 SELECT "user_id",
    "email",
    "created_at" AS "signup_date",
    (EXISTS ( SELECT 1
           FROM "public"."analytics_events" "e"
          WHERE (("e"."user_id" = "p"."user_id") AND ("e"."event_type" = 'whatsapp.connected'::"text")))) AS "whatsapp_connected",
    ( SELECT "min"("e"."created_at") AS "min"
           FROM "public"."analytics_events" "e"
          WHERE (("e"."user_id" = "p"."user_id") AND ("e"."event_type" = 'whatsapp.connected'::"text"))) AS "whatsapp_connected_at",
    (EXISTS ( SELECT 1
           FROM "public"."analytics_events" "e"
          WHERE (("e"."user_id" = "p"."user_id") AND ("e"."event_type" = 'contacts.imported'::"text")))) AS "contacts_imported",
    ( SELECT "min"("e"."created_at") AS "min"
           FROM "public"."analytics_events" "e"
          WHERE (("e"."user_id" = "p"."user_id") AND ("e"."event_type" = 'contacts.imported'::"text"))) AS "contacts_imported_at",
    (EXISTS ( SELECT 1
           FROM "public"."automations" "a"
          WHERE ("a"."user_id" = "p"."user_id"))) AS "automation_created",
    ( SELECT "min"("a"."created_at") AS "min"
           FROM "public"."automations" "a"
          WHERE ("a"."user_id" = "p"."user_id")) AS "automation_created_at",
    (EXISTS ( SELECT 1
           FROM "public"."analytics_events" "e"
          WHERE (("e"."user_id" = "p"."user_id") AND ("e"."event_type" = 'automation.activated'::"text")))) AS "automation_activated",
    ( SELECT "min"("e"."created_at") AS "min"
           FROM "public"."analytics_events" "e"
          WHERE (("e"."user_id" = "p"."user_id") AND ("e"."event_type" = 'automation.activated'::"text"))) AS "automation_activated_at",
    (EXISTS ( SELECT 1
           FROM "public"."analytics_events" "e"
          WHERE (("e"."user_id" = "p"."user_id") AND ("e"."event_type" = 'message.sent'::"text")))) AS "first_message_sent",
    ( SELECT "min"("e"."created_at") AS "min"
           FROM "public"."analytics_events" "e"
          WHERE (("e"."user_id" = "p"."user_id") AND ("e"."event_type" = 'message.sent'::"text"))) AS "first_message_sent_at",
    ( SELECT "count"(*) AS "count"
           FROM "public"."analytics_events" "e"
          WHERE (("e"."user_id" = "p"."user_id") AND ("e"."event_type" = 'message.sent'::"text"))) AS "total_messages_sent",
    ( SELECT "count"(DISTINCT "e"."automation_id") AS "count"
           FROM "public"."analytics_events" "e"
          WHERE (("e"."user_id" = "p"."user_id") AND ("e"."automation_id" IS NOT NULL))) AS "active_automations_count"
   FROM "public"."profiles" "p";


ALTER VIEW "public"."user_funnel_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_storage_quotas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "total_size_bytes" bigint DEFAULT 0 NOT NULL,
    "max_size_bytes" bigint DEFAULT '5368709120'::bigint NOT NULL,
    "file_count" integer DEFAULT 0 NOT NULL,
    "max_file_count" integer DEFAULT 1000 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_storage_quotas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_conditions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "webhook_id" "uuid" NOT NULL,
    "field_path" "text" NOT NULL,
    "operator" "text" NOT NULL,
    "value" "text" DEFAULT ''::"text" NOT NULL,
    "logic_operator" "text" DEFAULT 'AND'::"text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."webhook_conditions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_domain_allowlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "domain" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."webhook_domain_allowlist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_rate_limit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "webhook_id" "uuid" NOT NULL,
    "window_start" timestamp with time zone NOT NULL,
    "window_duration_seconds" integer DEFAULT 60 NOT NULL,
    "request_count" integer DEFAULT 0 NOT NULL,
    "max_requests" integer DEFAULT 30 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."webhook_rate_limit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_retry_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "webhook_id" "uuid" NOT NULL,
    "max_attempts" integer DEFAULT 5 NOT NULL,
    "initial_delay_seconds" integer DEFAULT 60 NOT NULL,
    "max_delay_seconds" integer DEFAULT 3600 NOT NULL,
    "backoff_multiplier" numeric(6,2) DEFAULT 2.0 NOT NULL,
    "retry_on_status_codes" integer[] DEFAULT ARRAY[408, 429, 500, 502, 503, 504] NOT NULL,
    "stop_on_status_codes" integer[] DEFAULT ARRAY[400, 401, 403, 404, 410] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."webhook_retry_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_secrets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "webhook_id" "uuid" NOT NULL,
    "encrypted_value" "text" NOT NULL,
    "secret_last4" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "rotated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '90 days'::interval) NOT NULL,
    "grace_expires_at" timestamp with time zone DEFAULT ("now"() + '97 days'::interval) NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "claimed_at" timestamp with time zone
);


ALTER TABLE "public"."webhook_secrets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_signature_nonces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "webhook_id" "uuid" NOT NULL,
    "signature_hex" "text" NOT NULL,
    "timestamp_ms" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."webhook_signature_nonces" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "provider" "public"."webhook_provider" NOT NULL,
    "description" "text",
    "logo_url" "text",
    "documentation_url" "text",
    "default_events" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "default_headers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "payload_template" "jsonb",
    "requires_auth" boolean DEFAULT false NOT NULL,
    "auth_type" "text",
    "config_schema" "jsonb",
    "example_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."webhook_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_validation_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "url" "text" NOT NULL,
    "blocked_reason" "text" NOT NULL,
    "resolved_ips" "text"[],
    "user_id" "uuid",
    "workspace_id" "uuid",
    "ip_address" "inet"
);


ALTER TABLE "public"."webhook_validation_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "whatsapp_instance_id" "uuid" NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "unread_count" integer DEFAULT 0 NOT NULL,
    "last_message_content" "text",
    "last_message_at" timestamp with time zone,
    "last_message_from_me" boolean,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "whatsapp_conversations_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'archived'::"text", 'spam'::"text"])))
);


ALTER TABLE "public"."whatsapp_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_health_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "messages_sent" integer DEFAULT 0,
    "messages_delivered" integer DEFAULT 0,
    "messages_read" integer DEFAULT 0,
    "messages_failed" integer DEFAULT 0,
    "responses_received" integer DEFAULT 0,
    "response_rate" numeric(5,2) DEFAULT 0,
    "blocks_reported" integer DEFAULT 0,
    "block_rate" numeric(5,2) DEFAULT 0,
    "opt_outs" integer DEFAULT 0,
    "opt_out_rate" numeric(5,2) DEFAULT 0,
    "health_status" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "whatsapp_health_metrics_health_status_check" CHECK (("health_status" = ANY (ARRAY['excellent'::"text", 'good'::"text", 'warning'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."whatsapp_health_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_instances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "instance_name" "text" NOT NULL,
    "evolution_instance_id" "text",
    "qr_code" "text",
    "status" "text" DEFAULT 'disconnected'::"text" NOT NULL,
    "phone_number" "text",
    "profile_name" "text",
    "profile_picture_url" "text",
    "webhook_url" "text",
    "webhook_events" "text"[] DEFAULT ARRAY['QRCODE_UPDATED'::"text", 'CONNECTION_UPDATE'::"text", 'MESSAGES_UPSERT'::"text"] NOT NULL,
    "connected_at" timestamp with time zone,
    "last_seen_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "whatsapp_instances_status_check" CHECK (("status" = ANY (ARRAY['disconnected'::"text", 'connecting'::"text", 'qr_ready'::"text", 'connected'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."whatsapp_instances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "whatsapp_instance_id" "uuid" NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "contact_id" "uuid",
    "message_id" "text" NOT NULL,
    "from_number" "text" NOT NULL,
    "to_number" "text" NOT NULL,
    "message_type" "text" NOT NULL,
    "content" "text",
    "media_url" "text",
    "media_mime_type" "text",
    "timestamp" timestamp with time zone NOT NULL,
    "is_from_me" boolean DEFAULT false NOT NULL,
    "processed" boolean DEFAULT false NOT NULL,
    "processed_at" timestamp with time zone,
    "automation_triggered" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "whatsapp_messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'audio'::"text", 'video'::"text", 'document'::"text", 'sticker'::"text", 'location'::"text", 'contact'::"text"])))
);


ALTER TABLE "public"."whatsapp_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workspace_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "invited_by" "uuid",
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workspace_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "plan_type" "text" DEFAULT 'free'::"text" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workspaces" OWNER TO "postgres";


ALTER TABLE ONLY "public"."alert_configs"
    ADD CONSTRAINT "alert_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alert_history"
    ADD CONSTRAINT "alert_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_encryption_keys"
    ADD CONSTRAINT "app_encryption_keys_key_name_key" UNIQUE ("key_name");



ALTER TABLE ONLY "public"."app_encryption_keys"
    ADD CONSTRAINT "app_encryption_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_events"
    ADD CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_execution_events"
    ADD CONSTRAINT "automation_execution_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_templates"
    ADD CONSTRAINT "automation_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_variables"
    ADD CONSTRAINT "automation_variables_automation_id_name_key" UNIQUE ("automation_id", "name");



ALTER TABLE ONLY "public"."automation_variables"
    ADD CONSTRAINT "automation_variables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_versions"
    ADD CONSTRAINT "automation_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automations"
    ADD CONSTRAINT "automations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."circuit_breaker_config"
    ADD CONSTRAINT "circuit_breaker_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cleanup_logs"
    ADD CONSTRAINT "cleanup_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cleanup_metrics"
    ADD CONSTRAINT "cleanup_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cloud_integrations"
    ADD CONSTRAINT "cloud_integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cloud_integrations"
    ADD CONSTRAINT "cloud_integrations_user_provider_unique" UNIQUE ("user_id", "provider");



ALTER TABLE ONLY "public"."cloud_sync_history"
    ADD CONSTRAINT "cloud_sync_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consent_history"
    ADD CONSTRAINT "consent_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cookie_preferences"
    ADD CONSTRAINT "cookie_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cookie_preferences"
    ADD CONSTRAINT "cookie_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."data_deletion_requests"
    ADD CONSTRAINT "data_deletion_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_export_requests"
    ADD CONSTRAINT "data_export_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_retention_policies"
    ADD CONSTRAINT "data_retention_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entity_comment_reads"
    ADD CONSTRAINT "entity_comment_reads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entity_comment_reads"
    ADD CONSTRAINT "entity_comment_reads_user_id_entity_type_entity_id_key" UNIQUE ("user_id", "entity_type", "entity_id");



ALTER TABLE ONLY "public"."entity_comments"
    ADD CONSTRAINT "entity_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."export_jobs"
    ADD CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."immutable_audit_log"
    ADD CONSTRAINT "immutable_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_competitor_analyses"
    ADD CONSTRAINT "market_competitor_analyses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_price_alerts"
    ADD CONSTRAINT "market_price_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_usage_daily"
    ADD CONSTRAINT "market_usage_daily_pkey" PRIMARY KEY ("user_id", "day");



ALTER TABLE ONLY "public"."market_user_plans"
    ADD CONSTRAINT "market_user_plans_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."market_watchlist"
    ADD CONSTRAINT "market_watchlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_folders"
    ADD CONSTRAINT "media_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_library"
    ADD CONSTRAINT "media_library_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_tag_assignments"
    ADD CONSTRAINT "media_tag_assignments_media_id_tag_id_key" UNIQUE ("media_id", "tag_id");



ALTER TABLE ONLY "public"."media_tag_assignments"
    ADD CONSTRAINT "media_tag_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_tags"
    ADD CONSTRAINT "media_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_tags"
    ADD CONSTRAINT "media_tags_user_id_name_key" UNIQUE ("user_id", "name");



ALTER TABLE ONLY "public"."message_templates"
    ADD CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."onboarding_progress"
    ADD CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."onboarding_progress"
    ADD CONSTRAINT "onboarding_progress_user_id_step_id_key" UNIQUE ("user_id", "step_id");



ALTER TABLE ONLY "public"."whatsapp_instances"
    ADD CONSTRAINT "one_instance_per_workspace" UNIQUE ("workspace_id");



ALTER TABLE ONLY "public"."policy_versions"
    ADD CONSTRAINT "policy_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."policy_versions"
    ADD CONSTRAINT "policy_versions_policy_type_version_key" UNIQUE ("policy_type", "version");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."rate_limit_config"
    ADD CONSTRAINT "rate_limit_config_endpoint_key" UNIQUE ("endpoint");



ALTER TABLE ONLY "public"."rate_limit_config"
    ADD CONSTRAINT "rate_limit_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limit_counters_v2"
    ADD CONSTRAINT "rate_limit_counters_v2_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limit_counters_v2"
    ADD CONSTRAINT "rate_limit_counters_v2_unique" UNIQUE ("rule_id", "identifier", "window_start");



ALTER TABLE ONLY "public"."rate_limit_events"
    ADD CONSTRAINT "rate_limit_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limit_rules_v2"
    ADD CONSTRAINT "rate_limit_rules_v2_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limit_rules_v2"
    ADD CONSTRAINT "rate_limit_rules_v2_unique" UNIQUE ("endpoint", "limit_type", "tier");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_permission_key" UNIQUE ("role", "permission");



ALTER TABLE ONLY "public"."saved_searches"
    ADD CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scheduled_automations"
    ADD CONSTRAINT "scheduled_automations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."signed_url_cache"
    ADD CONSTRAINT "signed_url_cache_file_path_key" UNIQUE ("file_path");



ALTER TABLE ONLY "public"."signed_url_cache"
    ADD CONSTRAINT "signed_url_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sli_metrics"
    ADD CONSTRAINT "sli_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sync_events"
    ADD CONSTRAINT "sync_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_installs"
    ADD CONSTRAINT "template_installs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_ratings"
    ADD CONSTRAINT "template_ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_ratings"
    ADD CONSTRAINT "template_ratings_template_id_user_id_key" UNIQUE ("template_id", "user_id");



ALTER TABLE ONLY "public"."trial_access"
    ADD CONSTRAINT "trial_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trial_access"
    ADD CONSTRAINT "trial_access_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."whatsapp_conversations"
    ADD CONSTRAINT "unique_conversation" UNIQUE ("whatsapp_instance_id", "contact_id");



ALTER TABLE ONLY "public"."whatsapp_messages"
    ADD CONSTRAINT "unique_message_per_instance" UNIQUE ("whatsapp_instance_id", "message_id");



ALTER TABLE ONLY "public"."upload_events"
    ADD CONSTRAINT "upload_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_consents"
    ADD CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."user_storage_quotas"
    ADD CONSTRAINT "user_storage_quotas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_storage_quotas"
    ADD CONSTRAINT "user_storage_quotas_user_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."webhook_circuit_breaker"
    ADD CONSTRAINT "webhook_circuit_breaker_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_circuit_breaker"
    ADD CONSTRAINT "webhook_circuit_breaker_webhook_unique" UNIQUE ("webhook_id");



ALTER TABLE ONLY "public"."webhook_conditions"
    ADD CONSTRAINT "webhook_conditions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_domain_allowlist"
    ADD CONSTRAINT "webhook_domain_allowlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_jobs"
    ADD CONSTRAINT "webhook_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_logs"
    ADD CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_rate_limit"
    ADD CONSTRAINT "webhook_rate_limit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_rate_limit"
    ADD CONSTRAINT "webhook_rate_limit_webhook_id_window_start_key" UNIQUE ("webhook_id", "window_start");



ALTER TABLE ONLY "public"."webhook_retry_config"
    ADD CONSTRAINT "webhook_retry_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_retry_config"
    ADD CONSTRAINT "webhook_retry_config_webhook_id_key" UNIQUE ("webhook_id");



ALTER TABLE ONLY "public"."webhook_retry_queue"
    ADD CONSTRAINT "webhook_retry_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_secrets"
    ADD CONSTRAINT "webhook_secrets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_signature_nonces"
    ADD CONSTRAINT "webhook_signature_nonces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_templates"
    ADD CONSTRAINT "webhook_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_validation_blocks"
    ADD CONSTRAINT "webhook_validation_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhooks"
    ADD CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_conversations"
    ADD CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_health_metrics"
    ADD CONSTRAINT "whatsapp_health_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_health_metrics"
    ADD CONSTRAINT "whatsapp_health_metrics_workspace_id_date_key" UNIQUE ("workspace_id", "date");



ALTER TABLE ONLY "public"."whatsapp_instances"
    ADD CONSTRAINT "whatsapp_instances_instance_name_key" UNIQUE ("instance_name");



ALTER TABLE ONLY "public"."whatsapp_instances"
    ADD CONSTRAINT "whatsapp_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_messages"
    ADD CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_id_user_id_key" UNIQUE ("workspace_id", "user_id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_slug_key" UNIQUE ("slug");



CREATE UNIQUE INDEX "automation_performance_automation_id_uidx" ON "private"."automation_performance" USING "btree" ("automation_id");



CREATE UNIQUE INDEX "storage_stats_by_user_user_id_uidx" ON "private"."storage_stats_by_user" USING "btree" ("user_id");



CREATE UNIQUE INDEX "webhook_stats_by_user_user_id_uidx" ON "private"."webhook_stats_by_user" USING "btree" ("user_id");



CREATE INDEX "cleanup_logs_entity_type" ON "public"."cleanup_logs" USING "btree" ("entity_type");



CREATE INDEX "cleanup_logs_executed_at" ON "public"."cleanup_logs" USING "btree" ("executed_at" DESC);



CREATE INDEX "cleanup_logs_workspace_id" ON "public"."cleanup_logs" USING "btree" ("workspace_id");



CREATE INDEX "data_retention_policies_entity_type" ON "public"."data_retention_policies" USING "btree" ("entity_type");



CREATE UNIQUE INDEX "data_retention_policies_unique_scope" ON "public"."data_retention_policies" USING "btree" ("entity_type", "apply_to_workspace_id");



CREATE INDEX "data_retention_policies_workspace" ON "public"."data_retention_policies" USING "btree" ("apply_to_workspace_id");



CREATE INDEX "idx_alert_configs_enabled" ON "public"."alert_configs" USING "btree" ("enabled");



CREATE INDEX "idx_alert_configs_user_id" ON "public"."alert_configs" USING "btree" ("user_id");



CREATE INDEX "idx_alert_history_alert_config_id_triggered_at" ON "public"."alert_history" USING "btree" ("alert_config_id", "triggered_at" DESC);



CREATE INDEX "idx_alert_history_user_id_triggered_at" ON "public"."alert_history" USING "btree" ("user_id", "triggered_at" DESC);



CREATE INDEX "idx_analytics_automation_created" ON "public"."analytics_events" USING "btree" ("automation_id", "created_at" DESC) WHERE ("automation_id" IS NOT NULL);



CREATE INDEX "idx_analytics_created" ON "public"."analytics_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_analytics_events_session_id" ON "public"."analytics_events" USING "btree" ("session_id") WHERE ("session_id" IS NOT NULL);



CREATE INDEX "idx_analytics_events_workspace_created" ON "public"."analytics_events" USING "btree" ("workspace_id", "created_at" DESC);



CREATE INDEX "idx_analytics_events_workspace_created_at" ON "public"."analytics_events" USING "btree" ("workspace_id", "created_at" DESC) WHERE ("workspace_id" IS NOT NULL);



CREATE INDEX "idx_analytics_events_workspace_event_created" ON "public"."analytics_events" USING "btree" ("workspace_id", "event_type", "created_at" DESC);



CREATE INDEX "idx_analytics_events_workspace_event_created_at" ON "public"."analytics_events" USING "btree" ("workspace_id", "event_type", "created_at" DESC) WHERE ("workspace_id" IS NOT NULL);



CREATE INDEX "idx_analytics_session" ON "public"."analytics_events" USING "btree" ("session_id", "created_at" DESC) WHERE ("session_id" IS NOT NULL);



CREATE INDEX "idx_analytics_user_type_created" ON "public"."analytics_events" USING "btree" ("user_id", "event_type", "created_at" DESC);



CREATE INDEX "idx_audit_action" ON "public"."audit_events" USING "btree" ("action");



CREATE INDEX "idx_audit_created" ON "public"."audit_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_entity" ON "public"."audit_events" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_audit_events_workspace_created" ON "public"."audit_events" USING "btree" ("workspace_id", "created_at" DESC);



CREATE INDEX "idx_audit_events_workspace_created_at" ON "public"."audit_events" USING "btree" ("workspace_id", "created_at" DESC);



CREATE INDEX "idx_audit_user_created" ON "public"."audit_events" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_audit_workspace_action_created" ON "public"."audit_events" USING "btree" ("workspace_id", "action", "created_at" DESC);



CREATE INDEX "idx_automation_exec_events_time" ON "public"."automation_execution_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_automation_exec_events_user_time" ON "public"."automation_execution_events" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_automation_templates_category" ON "public"."automation_templates" USING "btree" ("category");



CREATE INDEX "idx_automation_templates_created_at" ON "public"."automation_templates" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_automation_templates_public" ON "public"."automation_templates" USING "btree" ("is_public");



CREATE INDEX "idx_automation_templates_rating_avg" ON "public"."automation_templates" USING "btree" ("rating_avg" DESC NULLS LAST);



CREATE INDEX "idx_automation_templates_tags_gin" ON "public"."automation_templates" USING "gin" ("tags");



CREATE INDEX "idx_automation_templates_use_count" ON "public"."automation_templates" USING "btree" ("use_count" DESC);



CREATE INDEX "idx_automation_variables_automation_id" ON "public"."automation_variables" USING "btree" ("automation_id");



CREATE INDEX "idx_automation_variables_user_id" ON "public"."automation_variables" USING "btree" ("user_id");



CREATE INDEX "idx_automation_versions_automation_id" ON "public"."automation_versions" USING "btree" ("automation_id");



CREATE INDEX "idx_automation_versions_user_id" ON "public"."automation_versions" USING "btree" ("user_id");



CREATE INDEX "idx_automations_user_id" ON "public"."automations" USING "btree" ("user_id");



CREATE INDEX "idx_automations_workspace_id" ON "public"."automations" USING "btree" ("workspace_id");



CREATE INDEX "idx_automations_workspace_status_created" ON "public"."automations" USING "btree" ("workspace_id", "status", "created_at" DESC);



CREATE INDEX "idx_circuit_breaker_state" ON "public"."webhook_circuit_breaker" USING "btree" ("state");



CREATE INDEX "idx_circuit_breaker_webhook" ON "public"."webhook_circuit_breaker" USING "btree" ("webhook_id");



CREATE INDEX "idx_cleanup_metrics_run_at" ON "public"."cleanup_metrics" USING "btree" ("run_at" DESC);



CREATE INDEX "idx_cloud_integrations_provider" ON "public"."cloud_integrations" USING "btree" ("provider");



CREATE INDEX "idx_cloud_integrations_user" ON "public"."cloud_integrations" USING "btree" ("user_id");



CREATE INDEX "idx_cloud_sync_history_user" ON "public"."cloud_sync_history" USING "btree" ("user_id");



CREATE INDEX "idx_conditions_webhook" ON "public"."webhook_conditions" USING "btree" ("webhook_id");



CREATE INDEX "idx_consent_granted" ON "public"."consent_history" USING "btree" ("granted_at" DESC);



CREATE INDEX "idx_consent_user_type" ON "public"."consent_history" USING "btree" ("user_id", "consent_type", "granted_at" DESC);



CREATE INDEX "idx_contacts_ai_enriched_at" ON "public"."contacts" USING "btree" ("ai_enriched_at");



CREATE INDEX "idx_contacts_ai_review_status" ON "public"."contacts" USING "btree" ("ai_review_status");



CREATE INDEX "idx_contacts_opt_out" ON "public"."contacts" USING "btree" ("opt_out");



CREATE INDEX "idx_contacts_search" ON "public"."contacts" USING "gin" ("search_vector");



CREATE INDEX "idx_contacts_tags_gin" ON "public"."contacts" USING "gin" ("tags");



CREATE INDEX "idx_contacts_user_created" ON "public"."contacts" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_contacts_user_id" ON "public"."contacts" USING "btree" ("user_id");



CREATE INDEX "idx_contacts_workspace_id" ON "public"."contacts" USING "btree" ("workspace_id");



CREATE INDEX "idx_contacts_workspace_name_pattern" ON "public"."contacts" USING "btree" ("workspace_id", "name" "text_pattern_ops");



CREATE UNIQUE INDEX "idx_contacts_workspace_phone" ON "public"."contacts" USING "btree" ("workspace_id", "phone");



COMMENT ON INDEX "public"."idx_contacts_workspace_phone" IS 'Garante unicidade por workspace';



CREATE INDEX "idx_contacts_workspace_phone_pattern" ON "public"."contacts" USING "btree" ("workspace_id", "phone" "text_pattern_ops") WHERE ("phone" IS NOT NULL);



CREATE INDEX "idx_contacts_workspace_status_updated" ON "public"."contacts" USING "btree" ("workspace_id", "status", "updated_at" DESC);



CREATE INDEX "idx_cookie_preferences_user_id" ON "public"."cookie_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_data_export_requests_status_completed_at" ON "public"."data_export_requests" USING "btree" ("status", "completed_at");



CREATE INDEX "idx_deletion_scheduled" ON "public"."data_deletion_requests" USING "btree" ("scheduled_for") WHERE ("status" = 'scheduled'::"text");



CREATE INDEX "idx_deletion_user_status" ON "public"."data_deletion_requests" USING "btree" ("user_id", "status");



CREATE INDEX "idx_entity_comment_reads_entity" ON "public"."entity_comment_reads" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_entity_comment_reads_workspace" ON "public"."entity_comment_reads" USING "btree" ("workspace_id");



CREATE INDEX "idx_entity_comments_entity" ON "public"."entity_comments" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_entity_comments_parent" ON "public"."entity_comments" USING "btree" ("parent_comment_id");



CREATE INDEX "idx_entity_comments_workspace" ON "public"."entity_comments" USING "btree" ("workspace_id");



CREATE INDEX "idx_export_expires" ON "public"."data_export_requests" USING "btree" ("expires_at") WHERE ("expires_at" IS NOT NULL);



CREATE INDEX "idx_export_jobs_expires" ON "public"."export_jobs" USING "btree" ("expires_at") WHERE ("expires_at" IS NOT NULL);



CREATE INDEX "idx_export_jobs_status" ON "public"."export_jobs" USING "btree" ("status");



CREATE INDEX "idx_export_jobs_user" ON "public"."export_jobs" USING "btree" ("user_id");



CREATE INDEX "idx_export_user_status" ON "public"."data_export_requests" USING "btree" ("user_id", "status");



CREATE INDEX "idx_immutable_audit_action_created_at" ON "public"."immutable_audit_log" USING "btree" ("action", "created_at" DESC);



CREATE INDEX "idx_immutable_audit_entity" ON "public"."immutable_audit_log" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_immutable_audit_user_created_at" ON "public"."immutable_audit_log" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_immutable_audit_workspace_created_at" ON "public"."immutable_audit_log" USING "btree" ("workspace_id", "created_at" DESC);



CREATE INDEX "idx_market_competitor_analyses_created_at" ON "public"."market_competitor_analyses" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_market_competitor_analyses_marketplace_created_at" ON "public"."market_competitor_analyses" USING "btree" ("marketplace", "created_at" DESC);



CREATE INDEX "idx_market_competitor_analyses_user_created_at" ON "public"."market_competitor_analyses" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_market_price_alerts_ack" ON "public"."market_price_alerts" USING "btree" ("acknowledged_at", "created_at" DESC);



CREATE INDEX "idx_market_price_alerts_created_at" ON "public"."market_price_alerts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_market_price_alerts_user_created_at" ON "public"."market_price_alerts" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_market_usage_daily_day" ON "public"."market_usage_daily" USING "btree" ("day" DESC);



CREATE INDEX "idx_market_watchlist_active" ON "public"."market_watchlist" USING "btree" ("is_active", "created_at" DESC);



CREATE UNIQUE INDEX "idx_media_analytics_user" ON "public"."media_analytics_summary" USING "btree" ("user_id");



CREATE INDEX "idx_media_folder_mime" ON "public"."media_library" USING "btree" ("folder_id", "mime_type") WHERE ("folder_id" IS NOT NULL);



CREATE INDEX "idx_media_folders_parent" ON "public"."media_folders" USING "btree" ("parent_id");



CREATE INDEX "idx_media_folders_user" ON "public"."media_folders" USING "btree" ("user_id");



CREATE INDEX "idx_media_folders_workspace_id" ON "public"."media_folders" USING "btree" ("workspace_id");



CREATE INDEX "idx_media_library_folder_id" ON "public"."media_library" USING "btree" ("folder_id");



CREATE INDEX "idx_media_library_workspace_created" ON "public"."media_library" USING "btree" ("workspace_id", "created_at" DESC) INCLUDE ("file_size");



CREATE INDEX "idx_media_library_workspace_id" ON "public"."media_library" USING "btree" ("workspace_id");



CREATE INDEX "idx_media_search_created" ON "public"."media_library" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_media_search_mime" ON "public"."media_library" USING "btree" ("mime_type");



CREATE INDEX "idx_media_search_name_trgm" ON "public"."media_library" USING "gin" ("file_name" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_media_search_type" ON "public"."media_library" USING "btree" ("file_type");



CREATE INDEX "idx_media_tag_assignments_media" ON "public"."media_tag_assignments" USING "btree" ("media_id");



CREATE INDEX "idx_media_tag_assignments_tag" ON "public"."media_tag_assignments" USING "btree" ("tag_id");



CREATE INDEX "idx_media_tags" ON "public"."media_library" USING "gin" ("tags");



CREATE INDEX "idx_media_tags_user" ON "public"."media_tags" USING "btree" ("user_id");



CREATE INDEX "idx_media_tags_workspace_id" ON "public"."media_tags" USING "btree" ("workspace_id");



CREATE INDEX "idx_media_type" ON "public"."media_library" USING "btree" ("file_type");



CREATE INDEX "idx_media_user_created" ON "public"."media_library" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_message_templates_updated_at" ON "public"."message_templates" USING "btree" ("updated_at");



CREATE INDEX "idx_message_templates_user_id" ON "public"."message_templates" USING "btree" ("user_id");



CREATE INDEX "idx_message_templates_workspace_id" ON "public"."message_templates" USING "btree" ("workspace_id");



CREATE INDEX "idx_messages_blocked" ON "public"."messages" USING "btree" ("was_blocked");



CREATE INDEX "idx_messages_contact_created" ON "public"."messages" USING "btree" ("contact_id", "created_at" DESC);



CREATE INDEX "idx_messages_contact_created_at" ON "public"."messages" USING "btree" ("contact_id", "created_at" DESC);



CREATE INDEX "idx_messages_delivered" ON "public"."messages" USING "btree" ("was_delivered");



CREATE INDEX "idx_messages_read" ON "public"."messages" USING "btree" ("was_read");



CREATE INDEX "idx_messages_response" ON "public"."messages" USING "btree" ("received_response");



CREATE INDEX "idx_messages_sent_at" ON "public"."messages" USING "btree" ("sent_at" DESC);



CREATE INDEX "idx_messages_user_contact_created_at" ON "public"."messages" USING "btree" ("user_id", "contact_id", "created_at" DESC);



CREATE INDEX "idx_notifications_created" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_expires" ON "public"."notifications" USING "btree" ("expires_at") WHERE ("expires_at" IS NOT NULL);



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id", "read") WHERE ("read" = false);



CREATE INDEX "idx_onboarding_user" ON "public"."onboarding_progress" USING "btree" ("user_id");



CREATE INDEX "idx_onboarding_user_completed" ON "public"."onboarding_progress" USING "btree" ("user_id", "completed_at");



CREATE UNIQUE INDEX "idx_one_current_version_per_automation" ON "public"."automation_versions" USING "btree" ("automation_id") WHERE ("is_current" = true);



CREATE INDEX "idx_policy_type_effective" ON "public"."policy_versions" USING "btree" ("policy_type", "effective_from" DESC);



CREATE INDEX "idx_profiles_user_id" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "idx_rate_limit_counters_v2_lookup" ON "public"."rate_limit_counters_v2" USING "btree" ("endpoint", "identifier", "window_start");



CREATE INDEX "idx_rate_limit_created" ON "public"."rate_limit_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_rate_limit_ip_endpoint_time" ON "public"."rate_limit_events" USING "btree" ("ip_address", "endpoint", "created_at" DESC);



CREATE INDEX "idx_rate_limit_user_endpoint_time" ON "public"."rate_limit_events" USING "btree" ("user_id", "endpoint", "created_at" DESC);



CREATE INDEX "idx_rate_limit_webhook" ON "public"."webhook_rate_limit" USING "btree" ("webhook_id");



CREATE INDEX "idx_rate_limit_window" ON "public"."webhook_rate_limit" USING "btree" ("window_start");



CREATE INDEX "idx_retry_queue_next_retry" ON "public"."webhook_retry_queue" USING "btree" ("next_retry_at") WHERE ("status" = 'pending'::"public"."retry_status");



CREATE INDEX "idx_retry_queue_status" ON "public"."webhook_retry_queue" USING "btree" ("status");



CREATE INDEX "idx_retry_queue_webhook" ON "public"."webhook_retry_queue" USING "btree" ("webhook_id");



CREATE INDEX "idx_role_permissions_role" ON "public"."role_permissions" USING "btree" ("role");



CREATE INDEX "idx_saved_searches_favorite" ON "public"."saved_searches" USING "btree" ("user_id", "is_favorite") WHERE ("is_favorite" = true);



CREATE INDEX "idx_saved_searches_type" ON "public"."saved_searches" USING "btree" ("search_type");



CREATE INDEX "idx_saved_searches_user" ON "public"."saved_searches" USING "btree" ("user_id");



CREATE INDEX "idx_scheduled_automations_automation" ON "public"."scheduled_automations" USING "btree" ("automation_id");



CREATE INDEX "idx_scheduled_automations_next_run" ON "public"."scheduled_automations" USING "btree" ("next_run_at") WHERE ("enabled" = true);



CREATE INDEX "idx_signed_url_cache_expires" ON "public"."signed_url_cache" USING "btree" ("expires_at");



CREATE INDEX "idx_signed_url_cache_path" ON "public"."signed_url_cache" USING "btree" ("file_path");



CREATE INDEX "idx_sli_metrics_domain_created_at" ON "public"."sli_metrics" USING "btree" ("domain", "created_at" DESC);



CREATE INDEX "idx_sli_metrics_domain_window_start" ON "public"."sli_metrics" USING "btree" ("domain", "window_start" DESC);



CREATE INDEX "idx_sync_events_time" ON "public"."sync_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_sync_events_user_time" ON "public"."sync_events" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_sync_history_integration" ON "public"."cloud_sync_history" USING "btree" ("integration_id");



CREATE INDEX "idx_sync_history_status" ON "public"."cloud_sync_history" USING "btree" ("status");



CREATE INDEX "idx_template_installs_template" ON "public"."template_installs" USING "btree" ("template_id");



CREATE INDEX "idx_template_installs_user" ON "public"."template_installs" USING "btree" ("user_id");



CREATE INDEX "idx_template_ratings_template" ON "public"."template_ratings" USING "btree" ("template_id");



CREATE INDEX "idx_template_ratings_user" ON "public"."template_ratings" USING "btree" ("user_id");



CREATE INDEX "idx_upload_events_time" ON "public"."upload_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_upload_events_user_time" ON "public"."upload_events" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_user_consents_user_time" ON "public"."user_consents" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_user_consents_user_type" ON "public"."user_consents" USING "btree" ("user_id", "consent_type");



CREATE INDEX "idx_user_storage_quotas_user_id" ON "public"."user_storage_quotas" USING "btree" ("user_id");



CREATE INDEX "idx_versions_automation_created" ON "public"."automation_versions" USING "btree" ("automation_id", "created_at" DESC);



CREATE INDEX "idx_versions_current" ON "public"."automation_versions" USING "btree" ("automation_id", "is_current") WHERE ("is_current" = true);



CREATE INDEX "idx_versions_published" ON "public"."automation_versions" USING "btree" ("automation_id", "published_at" DESC) WHERE ("published_at" IS NOT NULL);



CREATE UNIQUE INDEX "idx_webhook_analytics_id" ON "public"."webhook_analytics_summary" USING "btree" ("webhook_id");



CREATE INDEX "idx_webhook_jobs_created_at" ON "public"."webhook_jobs" USING "btree" ("created_at");



CREATE INDEX "idx_webhook_jobs_pending_next_retry" ON "public"."webhook_jobs" USING "btree" ("status", "next_retry_at") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_webhook_jobs_status_next_retry" ON "public"."webhook_jobs" USING "btree" ("status", "next_retry_at");



CREATE INDEX "idx_webhook_jobs_webhook_id" ON "public"."webhook_jobs" USING "btree" ("webhook_id");



CREATE INDEX "idx_webhook_jobs_webhook_status_created" ON "public"."webhook_jobs" USING "btree" ("webhook_id", "status", "created_at" DESC);



CREATE INDEX "idx_webhook_logs_duration_success" ON "public"."webhook_logs" USING "btree" ("webhook_id", "duration_ms") WHERE ("success" = true);



CREATE INDEX "idx_webhook_logs_executed_at" ON "public"."webhook_logs" USING "btree" ("executed_at");



CREATE INDEX "idx_webhook_logs_success" ON "public"."webhook_logs" USING "btree" ("webhook_id", "success", "executed_at" DESC);



CREATE INDEX "idx_webhook_logs_webhook_executed" ON "public"."webhook_logs" USING "btree" ("webhook_id", "executed_at" DESC);



CREATE INDEX "idx_webhook_logs_webhook_executed_at" ON "public"."webhook_logs" USING "btree" ("webhook_id", "executed_at" DESC);



CREATE INDEX "idx_webhook_logs_webhook_id_executed_at" ON "public"."webhook_logs" USING "btree" ("webhook_id", "executed_at");



CREATE INDEX "idx_webhook_logs_webhook_status" ON "public"."webhook_logs" USING "btree" ("webhook_id", "response_status");



CREATE INDEX "idx_webhook_logs_webhook_success_executed" ON "public"."webhook_logs" USING "btree" ("webhook_id", "success", "executed_at" DESC);



CREATE INDEX "idx_webhook_search_name_trgm" ON "public"."webhooks" USING "gin" ("name" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_webhook_search_url_trgm" ON "public"."webhooks" USING "gin" ("url" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_webhook_secrets_rotation_due" ON "public"."webhook_secrets" USING "btree" ("expires_at") WHERE ("active" = true);



CREATE INDEX "idx_webhook_secrets_user_id" ON "public"."webhook_secrets" USING "btree" ("user_id");



CREATE INDEX "idx_webhook_secrets_webhook_id" ON "public"."webhook_secrets" USING "btree" ("webhook_id");



CREATE INDEX "idx_webhook_signature_nonces_expires" ON "public"."webhook_signature_nonces" USING "btree" ("expires_at");



CREATE INDEX "idx_webhook_signature_nonces_lookup" ON "public"."webhook_signature_nonces" USING "btree" ("webhook_id", "signature_hex");



CREATE INDEX "idx_webhook_templates_active" ON "public"."webhook_templates" USING "btree" ("is_active");



CREATE INDEX "idx_webhook_templates_provider" ON "public"."webhook_templates" USING "btree" ("provider");



CREATE INDEX "idx_webhook_validation_blocks_created_at" ON "public"."webhook_validation_blocks" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_webhook_validation_blocks_user_id" ON "public"."webhook_validation_blocks" USING "btree" ("user_id");



CREATE INDEX "idx_webhook_validation_blocks_workspace_id" ON "public"."webhook_validation_blocks" USING "btree" ("workspace_id");



CREATE INDEX "idx_webhooks_active_by_user_name" ON "public"."webhooks" USING "btree" ("user_id", "name") WHERE ("is_active" = true);



CREATE INDEX "idx_webhooks_template_id" ON "public"."webhooks" USING "btree" ("template_id");



CREATE INDEX "idx_webhooks_user_active" ON "public"."webhooks" USING "btree" ("user_id", "is_active");



CREATE INDEX "idx_webhooks_user_active_created" ON "public"."webhooks" USING "btree" ("user_id", "is_active", "created_at" DESC);



CREATE INDEX "idx_webhooks_workspace" ON "public"."webhooks" USING "btree" ("workspace_id");



CREATE INDEX "idx_whatsapp_conversations_instance" ON "public"."whatsapp_conversations" USING "btree" ("whatsapp_instance_id", "updated_at" DESC);



CREATE INDEX "idx_whatsapp_conversations_status" ON "public"."whatsapp_conversations" USING "btree" ("status", "updated_at" DESC);



CREATE INDEX "idx_whatsapp_conversations_unread" ON "public"."whatsapp_conversations" USING "btree" ("workspace_id", "unread_count" DESC) WHERE ("unread_count" > 0);



CREATE INDEX "idx_whatsapp_conversations_workspace" ON "public"."whatsapp_conversations" USING "btree" ("workspace_id", "updated_at" DESC);



CREATE INDEX "idx_whatsapp_health_date" ON "public"."whatsapp_health_metrics" USING "btree" ("date" DESC);



CREATE INDEX "idx_whatsapp_health_workspace" ON "public"."whatsapp_health_metrics" USING "btree" ("workspace_id");



CREATE INDEX "idx_whatsapp_instances_phone" ON "public"."whatsapp_instances" USING "btree" ("phone_number") WHERE ("phone_number" IS NOT NULL);



CREATE INDEX "idx_whatsapp_instances_status" ON "public"."whatsapp_instances" USING "btree" ("status");



CREATE INDEX "idx_whatsapp_instances_workspace" ON "public"."whatsapp_instances" USING "btree" ("workspace_id");



CREATE INDEX "idx_whatsapp_messages_contact" ON "public"."whatsapp_messages" USING "btree" ("contact_id", "created_at" DESC);



CREATE INDEX "idx_whatsapp_messages_from" ON "public"."whatsapp_messages" USING "btree" ("from_number");



CREATE INDEX "idx_whatsapp_messages_instance" ON "public"."whatsapp_messages" USING "btree" ("whatsapp_instance_id", "created_at" DESC);



CREATE INDEX "idx_whatsapp_messages_unprocessed" ON "public"."whatsapp_messages" USING "btree" ("whatsapp_instance_id") WHERE ("processed" = false);



CREATE INDEX "idx_whatsapp_messages_workspace" ON "public"."whatsapp_messages" USING "btree" ("workspace_id", "created_at" DESC);



CREATE INDEX "idx_workspace_invitations_email" ON "public"."workspace_invitations" USING "btree" ("email");



CREATE INDEX "idx_workspace_invitations_workspace_id" ON "public"."workspace_invitations" USING "btree" ("workspace_id");



CREATE INDEX "idx_workspace_members_user_id" ON "public"."workspace_members" USING "btree" ("user_id");



CREATE INDEX "idx_workspace_members_workspace_id" ON "public"."workspace_members" USING "btree" ("workspace_id");



CREATE UNIQUE INDEX "uniq_scheduled_automations_active_per_automation" ON "public"."scheduled_automations" USING "btree" ("automation_id") WHERE ("enabled" = true);



CREATE UNIQUE INDEX "uniq_webhook_active_secret" ON "public"."webhook_secrets" USING "btree" ("webhook_id") WHERE ("active" = true);



CREATE UNIQUE INDEX "uq_template_installs_template_user" ON "public"."template_installs" USING "btree" ("template_id", "user_id");



CREATE UNIQUE INDEX "ux_market_watchlist_user_url" ON "public"."market_watchlist" USING "btree" ("user_id", "source_url");



CREATE UNIQUE INDEX "webhook_domain_allowlist_workspace_domain_uidx" ON "public"."webhook_domain_allowlist" USING "btree" ("workspace_id", "lower"("domain"));



CREATE OR REPLACE TRIGGER "automation_audit_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."automations" FOR EACH ROW EXECUTE FUNCTION "public"."audit_automation_changes"();



CREATE OR REPLACE TRIGGER "automation_auto_version_trigger" AFTER UPDATE ON "public"."automations" FOR EACH ROW WHEN (("old"."doc" IS DISTINCT FROM "new"."doc")) EXECUTE FUNCTION "public"."auto_create_version"();



CREATE OR REPLACE TRIGGER "contacts_search_vector_trigger" BEFORE INSERT OR UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."contacts_search_vector_update"();



CREATE OR REPLACE TRIGGER "normalize_phone_before_insert" BEFORE INSERT OR UPDATE OF "phone" ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_normalize_phone"();



COMMENT ON TRIGGER "normalize_phone_before_insert" ON "public"."contacts" IS 'Normaliza antes de inserir';



CREATE OR REPLACE TRIGGER "notify_circuit_breaker_trigger" AFTER INSERT OR UPDATE ON "public"."webhook_circuit_breaker" FOR EACH ROW EXECUTE FUNCTION "public"."notify_circuit_breaker_open"();



CREATE OR REPLACE TRIGGER "notify_storage_quota_trigger" AFTER UPDATE ON "public"."user_storage_quotas" FOR EACH ROW WHEN (("new"."total_size_bytes" IS DISTINCT FROM "old"."total_size_bytes")) EXECUTE FUNCTION "public"."notify_storage_quota"();



CREATE OR REPLACE TRIGGER "notify_webhook_failures_trigger" AFTER INSERT ON "public"."webhook_logs" FOR EACH ROW WHEN ((("new"."success" IS DISTINCT FROM true) OR (("new"."response_status" IS NOT NULL) AND ("new"."response_status" >= 400)) OR ("new"."error_message" IS NOT NULL))) EXECUTE FUNCTION "public"."notify_webhook_failures"();



CREATE OR REPLACE TRIGGER "on_media_library_change" AFTER INSERT OR DELETE ON "public"."media_library" FOR EACH ROW EXECUTE FUNCTION "public"."update_storage_quota"();



CREATE OR REPLACE TRIGGER "set_saved_searches_updated_at" BEFORE UPDATE ON "public"."saved_searches" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_webhook_retry_config_updated_at" BEFORE UPDATE ON "public"."webhook_retry_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_webhook_retry_queue_updated_at" BEFORE UPDATE ON "public"."webhook_retry_queue" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_alert_configs_set_updated_at" BEFORE UPDATE ON "public"."alert_configs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_automation_templates_updated_at" BEFORE UPDATE ON "public"."automation_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_block_immutable_audit_log_mutations" BEFORE DELETE OR UPDATE ON "public"."immutable_audit_log" FOR EACH ROW EXECUTE FUNCTION "public"."block_immutable_audit_log_mutations"();



CREATE OR REPLACE TRIGGER "trg_entity_comment_reads_set_updated_at" BEFORE UPDATE ON "public"."entity_comment_reads" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_entity_comments_set_updated_at" BEFORE UPDATE ON "public"."entity_comments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_notify_data_deletion_approved" AFTER UPDATE OF "status" ON "public"."data_deletion_requests" FOR EACH ROW EXECUTE FUNCTION "public"."notify_data_deletion_approved"();



CREATE OR REPLACE TRIGGER "trg_prevent_plaintext_webhook_secret" BEFORE INSERT OR UPDATE ON "public"."webhooks" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_plaintext_webhook_secret"();



CREATE OR REPLACE TRIGGER "trg_profiles_ensure_primary_workspace_membership" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_primary_workspace_membership"();



CREATE OR REPLACE TRIGGER "trg_rate_limit_counters_v2_updated_at" BEFORE UPDATE ON "public"."rate_limit_counters_v2" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_rate_limit_rules_v2_updated_at" BEFORE UPDATE ON "public"."rate_limit_rules_v2" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_template_installs_inc_use_count" AFTER INSERT ON "public"."template_installs" FOR EACH ROW EXECUTE FUNCTION "public"."increment_template_use_count"();



CREATE OR REPLACE TRIGGER "trg_template_ratings_recompute_avg" AFTER INSERT OR DELETE OR UPDATE ON "public"."template_ratings" FOR EACH ROW EXECUTE FUNCTION "public"."recompute_template_rating_avg"();



CREATE OR REPLACE TRIGGER "trg_template_ratings_requires_install" BEFORE INSERT OR UPDATE ON "public"."template_ratings" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_rating_requires_install"();



CREATE OR REPLACE TRIGGER "trg_validate_contacts_ai_review_status" BEFORE INSERT OR UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."validate_contacts_ai_review_status"();



CREATE OR REPLACE TRIGGER "trg_validate_invitation_expires_at" BEFORE INSERT OR UPDATE ON "public"."workspace_invitations" FOR EACH ROW EXECUTE FUNCTION "public"."validate_invitation_expires_at"();



CREATE OR REPLACE TRIGGER "trg_webhook_templates_updated_at" BEFORE UPDATE ON "public"."webhook_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_calculate_health" BEFORE INSERT OR UPDATE ON "public"."whatsapp_health_metrics" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_whatsapp_health_status"();



CREATE OR REPLACE TRIGGER "update_automation_variables_updated_at" BEFORE UPDATE ON "public"."automation_variables" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_automations_updated_at" BEFORE UPDATE ON "public"."automations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_cloud_integrations_updated_at" BEFORE UPDATE ON "public"."cloud_integrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_contacts_updated_at" BEFORE UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_cookie_preferences_updated_at" BEFORE UPDATE ON "public"."cookie_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_data_retention_policies_updated_at" BEFORE UPDATE ON "public"."data_retention_policies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_media_folders_updated_at" BEFORE UPDATE ON "public"."media_folders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_media_tags_updated_at" BEFORE UPDATE ON "public"."media_tags" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_message_templates_updated_at" BEFORE UPDATE ON "public"."message_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_messages_updated_at" BEFORE UPDATE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notification_preferences_updated_at" BEFORE UPDATE ON "public"."notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rate_limit_config_updated_at" BEFORE UPDATE ON "public"."rate_limit_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_scheduled_automations_updated_at" BEFORE UPDATE ON "public"."scheduled_automations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_trial_access_updated_at" BEFORE UPDATE ON "public"."trial_access" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_whatsapp_conversations_updated_at" BEFORE UPDATE ON "public"."whatsapp_conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_whatsapp_updated_at"();



CREATE OR REPLACE TRIGGER "update_whatsapp_instances_updated_at" BEFORE UPDATE ON "public"."whatsapp_instances" FOR EACH ROW EXECUTE FUNCTION "public"."update_whatsapp_updated_at"();



CREATE OR REPLACE TRIGGER "user_storage_quotas_set_updated_at" BEFORE UPDATE ON "public"."user_storage_quotas" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "webhook_circuit_breaker_set_updated_at" BEFORE UPDATE ON "public"."webhook_circuit_breaker" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."alert_history"
    ADD CONSTRAINT "alert_history_alert_config_id_fkey" FOREIGN KEY ("alert_config_id") REFERENCES "public"."alert_configs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_events"
    ADD CONSTRAINT "audit_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."automation_versions"
    ADD CONSTRAINT "automation_versions_rollback_from_fkey" FOREIGN KEY ("rollback_from") REFERENCES "public"."automation_versions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."automations"
    ADD CONSTRAINT "automations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cleanup_logs"
    ADD CONSTRAINT "cleanup_logs_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "public"."data_retention_policies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cloud_sync_history"
    ADD CONSTRAINT "cloud_sync_history_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "public"."cloud_integrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cookie_preferences"
    ADD CONSTRAINT "cookie_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entity_comment_reads"
    ADD CONSTRAINT "entity_comment_reads_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entity_comments"
    ADD CONSTRAINT "entity_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."entity_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entity_comments"
    ADD CONSTRAINT "entity_comments_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."immutable_audit_log"
    ADD CONSTRAINT "immutable_audit_log_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");



ALTER TABLE ONLY "public"."media_folders"
    ADD CONSTRAINT "media_folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."media_folders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_folders"
    ADD CONSTRAINT "media_folders_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."media_library"
    ADD CONSTRAINT "media_library_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."media_folders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."media_library"
    ADD CONSTRAINT "media_library_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."media_tag_assignments"
    ADD CONSTRAINT "media_tag_assignments_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media_library"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_tag_assignments"
    ADD CONSTRAINT "media_tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."media_tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_tags"
    ADD CONSTRAINT "media_tags_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_contact_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rate_limit_counters_v2"
    ADD CONSTRAINT "rate_limit_counters_v2_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "public"."rate_limit_rules_v2"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_automations"
    ADD CONSTRAINT "scheduled_automations_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_installs"
    ADD CONSTRAINT "template_installs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."automation_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_ratings"
    ADD CONSTRAINT "template_ratings_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."automation_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhook_circuit_breaker"
    ADD CONSTRAINT "webhook_circuit_breaker_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhook_conditions"
    ADD CONSTRAINT "webhook_conditions_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhook_domain_allowlist"
    ADD CONSTRAINT "webhook_domain_allowlist_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhook_jobs"
    ADD CONSTRAINT "webhook_jobs_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhook_logs"
    ADD CONSTRAINT "webhook_logs_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhook_rate_limit"
    ADD CONSTRAINT "webhook_rate_limit_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhook_retry_config"
    ADD CONSTRAINT "webhook_retry_config_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhook_retry_queue"
    ADD CONSTRAINT "webhook_retry_queue_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhook_retry_queue"
    ADD CONSTRAINT "webhook_retry_queue_webhook_log_id_fkey" FOREIGN KEY ("webhook_log_id") REFERENCES "public"."webhook_logs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."webhook_signature_nonces"
    ADD CONSTRAINT "webhook_signature_nonces_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhooks"
    ADD CONSTRAINT "webhooks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."webhook_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."whatsapp_conversations"
    ADD CONSTRAINT "whatsapp_conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_conversations"
    ADD CONSTRAINT "whatsapp_conversations_whatsapp_instance_id_fkey" FOREIGN KEY ("whatsapp_instance_id") REFERENCES "public"."whatsapp_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_conversations"
    ADD CONSTRAINT "whatsapp_conversations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_health_metrics"
    ADD CONSTRAINT "whatsapp_health_metrics_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_instances"
    ADD CONSTRAINT "whatsapp_instances_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_messages"
    ADD CONSTRAINT "whatsapp_messages_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."whatsapp_messages"
    ADD CONSTRAINT "whatsapp_messages_whatsapp_instance_id_fkey" FOREIGN KEY ("whatsapp_instance_id") REFERENCES "public"."whatsapp_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_messages"
    ADD CONSTRAINT "whatsapp_messages_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage role permissions" ON "public"."role_permissions" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage user roles" ON "public"."user_roles" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can read all user roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can read role permissions" ON "public"."role_permissions" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all analytics" ON "public"."analytics_events" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all audit events" ON "public"."audit_events" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Config is publicly readable" ON "public"."circuit_breaker_config" FOR SELECT USING (true);



CREATE POLICY "Policy versions are readable by everyone" ON "public"."policy_versions" FOR SELECT USING (true);



CREATE POLICY "Public can read webhook templates" ON "public"."webhook_templates" FOR SELECT USING (true);



CREATE POLICY "Service role can delete cleanup metrics" ON "public"."cleanup_metrics" FOR DELETE USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can insert cleanup metrics" ON "public"."cleanup_metrics" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can insert notifications" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage encryption keys" ON "public"."app_encryption_keys" TO "authenticated" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage notifications" ON "public"."notifications" TO "authenticated" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can read cleanup metrics" ON "public"."cleanup_metrics" FOR SELECT USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can update cleanup metrics" ON "public"."cleanup_metrics" FOR UPDATE USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can create export jobs" ON "public"."export_jobs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own deletion requests" ON "public"."data_deletion_requests" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own export requests" ON "public"."data_export_requests" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own messages" ON "public"."messages" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."contacts" "c"
  WHERE (("c"."id" = "messages"."contact_id") AND ("c"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can create their automation variables" ON "public"."automation_variables" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their automation versions" ON "public"."automation_versions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own trial status" ON "public"."trial_access" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own alert configs" ON "public"."alert_configs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own integrations" ON "public"."cloud_integrations" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own messages" ON "public"."messages" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete scheduled automations for own automations with" ON "public"."scheduled_automations" FOR DELETE USING ((("auth"."uid"() = "user_id") AND "public"."check_permission"('automations.edit'::"public"."permission_type") AND (EXISTS ( SELECT 1
   FROM "public"."automations" "a"
  WHERE (("a"."id" = "scheduled_automations"."automation_id") AND ("a"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can delete their automation variables" ON "public"."automation_variables" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their automation versions" ON "public"."automation_versions" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own cookie preferences" ON "public"."cookie_preferences" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own alert configs" ON "public"."alert_configs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own alert history" ON "public"."alert_history" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own analytics events" ON "public"."analytics_events" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own consent history" ON "public"."consent_history" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own consents" ON "public"."user_consents" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own integrations" ON "public"."cloud_integrations" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own onboarding progress" ON "public"."onboarding_progress" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own sync history" ON "public"."cloud_sync_history" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert scheduled automations for own automations with" ON "public"."scheduled_automations" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."check_permission"('automations.edit'::"public"."permission_type") AND (EXISTS ( SELECT 1
   FROM "public"."automations" "a"
  WHERE (("a"."id" = "scheduled_automations"."automation_id") AND ("a"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can insert their own cookie preferences" ON "public"."cookie_preferences" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own preferences" ON "public"."notification_preferences" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own saved searches" ON "public"."saved_searches" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can select own alert configs" ON "public"."alert_configs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can select own alert history" ON "public"."alert_history" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can select own integrations" ON "public"."cloud_integrations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can select own scheduled automations" ON "public"."scheduled_automations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own alert configs" ON "public"."alert_configs" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own integrations" ON "public"."cloud_integrations" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own messages" ON "public"."messages" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own sync history" ON "public"."cloud_sync_history" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update scheduled automations for own automations with" ON "public"."scheduled_automations" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND "public"."check_permission"('automations.edit'::"public"."permission_type") AND (EXISTS ( SELECT 1
   FROM "public"."automations" "a"
  WHERE (("a"."id" = "scheduled_automations"."automation_id") AND ("a"."user_id" = "auth"."uid"())))))) WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."check_permission"('automations.edit'::"public"."permission_type") AND (EXISTS ( SELECT 1
   FROM "public"."automations" "a"
  WHERE (("a"."id" = "scheduled_automations"."automation_id") AND ("a"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update their automation variables" ON "public"."automation_variables" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own cookie preferences" ON "public"."cookie_preferences" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own analytics events" ON "public"."analytics_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own audit events" ON "public"."audit_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own consent history" ON "public"."consent_history" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own consents" ON "public"."user_consents" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own deletion requests" ON "public"."data_deletion_requests" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own export jobs" ON "public"."export_jobs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own export requests" ON "public"."data_export_requests" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own messages" ON "public"."messages" FOR SELECT USING ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."contacts" "c"
  WHERE (("c"."id" = "messages"."contact_id") AND ("c"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own onboarding progress" ON "public"."onboarding_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own quota" ON "public"."user_storage_quotas" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own rate limit events" ON "public"."rate_limit_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own sync history" ON "public"."cloud_sync_history" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their automation variables" ON "public"."automation_variables" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their automation versions" ON "public"."automation_versions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own cookie preferences" ON "public"."cookie_preferences" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own trial status" ON "public"."trial_access" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "admins_manage_rate_limit_config" ON "public"."rate_limit_config" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_select_all_export_requests" ON "public"."data_export_requests" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_select_rate_limit_counters_v2" ON "public"."rate_limit_counters_v2" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_select_rate_limit_events" ON "public"."rate_limit_events" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_select_rate_limit_rules_v2" ON "public"."rate_limit_rules_v2" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_select_webhook_validation_blocks" ON "public"."webhook_validation_blocks" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_update_export_requests" ON "public"."data_export_requests" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



ALTER TABLE "public"."alert_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alert_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_encryption_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "automation_exec_events_insert_own" ON "public"."automation_execution_events" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "automation_exec_events_select_own" ON "public"."automation_execution_events" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."automation_execution_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."automation_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "automation_templates_delete_own" ON "public"."automation_templates" FOR DELETE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "automation_templates_insert_own" ON "public"."automation_templates" FOR INSERT WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "automation_templates_select_public_or_own" ON "public"."automation_templates" FOR SELECT USING ((("is_public" = true) OR ("created_by" = "auth"."uid"())));



CREATE POLICY "automation_templates_update_own" ON "public"."automation_templates" FOR UPDATE USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));



ALTER TABLE "public"."automation_variables" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."automation_versions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "automation_versions_delete_own" ON "public"."automation_versions" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."automations" "a"
  WHERE (("a"."id" = "automation_versions"."automation_id") AND ("a"."user_id" = "auth"."uid"())))));



CREATE POLICY "automation_versions_insert_own" ON "public"."automation_versions" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."automations" "a"
  WHERE (("a"."id" = "automation_versions"."automation_id") AND ("a"."user_id" = "auth"."uid"()))))));



CREATE POLICY "automation_versions_select_own" ON "public"."automation_versions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."automations" "a"
  WHERE (("a"."id" = "automation_versions"."automation_id") AND ("a"."user_id" = "auth"."uid"())))));



CREATE POLICY "automation_versions_update_own" ON "public"."automation_versions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."automations" "a"
  WHERE (("a"."id" = "automation_versions"."automation_id") AND ("a"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."automations" "a"
  WHERE (("a"."id" = "automation_versions"."automation_id") AND ("a"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."automations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."circuit_breaker_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cleanup_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cleanup_logs_select" ON "public"."cleanup_logs" FOR SELECT USING (((("workspace_id" IS NULL) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) OR (("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('settings.manage'::"text", "workspace_id"))));



ALTER TABLE "public"."cleanup_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cloud_integrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cloud_sync_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consent_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cookie_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_deletion_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_export_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_retention_policies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "data_retention_policies_delete" ON "public"."data_retention_policies" FOR DELETE USING (((("is_global" = true) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) OR (("apply_to_workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("apply_to_workspace_id", "auth"."uid"()) AND "public"."has_permission"('settings.manage'::"text", "apply_to_workspace_id"))));



CREATE POLICY "data_retention_policies_insert" ON "public"."data_retention_policies" FOR INSERT WITH CHECK (((("is_global" = true) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) OR (("apply_to_workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("apply_to_workspace_id", "auth"."uid"()) AND "public"."has_permission"('settings.manage'::"text", "apply_to_workspace_id"))));



CREATE POLICY "data_retention_policies_select" ON "public"."data_retention_policies" FOR SELECT USING (((("is_global" = true) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) OR (("apply_to_workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("apply_to_workspace_id", "auth"."uid"()) AND "public"."has_permission"('settings.manage'::"text", "apply_to_workspace_id"))));



CREATE POLICY "data_retention_policies_update" ON "public"."data_retention_policies" FOR UPDATE USING (((("is_global" = true) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) OR (("apply_to_workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("apply_to_workspace_id", "auth"."uid"()) AND "public"."has_permission"('settings.manage'::"text", "apply_to_workspace_id")))) WITH CHECK (((("is_global" = true) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) OR (("apply_to_workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("apply_to_workspace_id", "auth"."uid"()) AND "public"."has_permission"('settings.manage'::"text", "apply_to_workspace_id"))));



ALTER TABLE "public"."entity_comment_reads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entity_comment_reads_insert_own" ON "public"."entity_comment_reads" FOR INSERT WITH CHECK (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "entity_comment_reads_select_own" ON "public"."entity_comment_reads" FOR SELECT USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "entity_comment_reads_update_own" ON "public"."entity_comment_reads" FOR UPDATE USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND ("user_id" = "auth"."uid"()))) WITH CHECK (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."entity_comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entity_comments_delete_own" ON "public"."entity_comments" FOR DELETE USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "entity_comments_insert_workspace" ON "public"."entity_comments" FOR INSERT WITH CHECK (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "entity_comments_select_workspace" ON "public"."entity_comments" FOR SELECT USING ("public"."is_workspace_member"("workspace_id", "auth"."uid"()));



CREATE POLICY "entity_comments_update_own" ON "public"."entity_comments" FOR UPDATE USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND ("user_id" = "auth"."uid"()))) WITH CHECK (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."export_jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "immutable_audit_insert_own" ON "public"."immutable_audit_log" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (("workspace_id" IS NULL) OR "public"."is_workspace_member"("workspace_id", "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"))));



ALTER TABLE "public"."immutable_audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "immutable_audit_select_admin_all" ON "public"."immutable_audit_log" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "immutable_audit_select_workspace" ON "public"."immutable_audit_log" FOR SELECT TO "authenticated" USING ((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"())));



ALTER TABLE "public"."market_competitor_analyses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "market_competitor_analyses_service_role" ON "public"."market_competitor_analyses" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."market_price_alerts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "market_price_alerts_service_role" ON "public"."market_price_alerts" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."market_usage_daily" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "market_usage_daily_service_role" ON "public"."market_usage_daily" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."market_user_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "market_user_plans_service_role" ON "public"."market_user_plans" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."market_watchlist" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "market_watchlist_service_role" ON "public"."market_watchlist" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."media_folders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "media_folders_delete" ON "public"."media_folders" FOR DELETE TO "authenticated" USING (((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('media.manage'::"text", "workspace_id")) OR (("workspace_id" IS NULL) AND ("user_id" = "auth"."uid"()))));



CREATE POLICY "media_folders_insert" ON "public"."media_folders" FOR INSERT TO "authenticated" WITH CHECK (((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('media.manage'::"text", "workspace_id")) OR (("workspace_id" IS NULL) AND ("user_id" = "auth"."uid"()))));



CREATE POLICY "media_folders_select" ON "public"."media_folders" FOR SELECT TO "authenticated" USING (((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('media.view'::"text", "workspace_id")) OR (("workspace_id" IS NULL) AND ("user_id" = "auth"."uid"()))));



CREATE POLICY "media_folders_update" ON "public"."media_folders" FOR UPDATE TO "authenticated" USING (((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('media.manage'::"text", "workspace_id")) OR (("workspace_id" IS NULL) AND ("user_id" = "auth"."uid"())))) WITH CHECK (((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('media.manage'::"text", "workspace_id")) OR (("workspace_id" IS NULL) AND ("user_id" = "auth"."uid"()))));



ALTER TABLE "public"."media_library" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media_tag_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "media_tag_assignments_manage" ON "public"."media_tag_assignments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."media_library" "ml"
  WHERE (("ml"."id" = "media_tag_assignments"."media_id") AND "public"."is_workspace_member"("ml"."workspace_id", "auth"."uid"()) AND "public"."has_permission"('media.manage'::"text", "ml"."workspace_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."media_library" "ml"
  WHERE (("ml"."id" = "media_tag_assignments"."media_id") AND "public"."is_workspace_member"("ml"."workspace_id", "auth"."uid"()) AND "public"."has_permission"('media.manage'::"text", "ml"."workspace_id")))));



ALTER TABLE "public"."media_tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "media_tags_delete" ON "public"."media_tags" FOR DELETE TO "authenticated" USING (((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('media.manage'::"text", "workspace_id")) OR (("workspace_id" IS NULL) AND ("user_id" = "auth"."uid"()))));



CREATE POLICY "media_tags_insert" ON "public"."media_tags" FOR INSERT TO "authenticated" WITH CHECK (((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('media.manage'::"text", "workspace_id")) OR (("workspace_id" IS NULL) AND ("user_id" = "auth"."uid"()))));



CREATE POLICY "media_tags_select" ON "public"."media_tags" FOR SELECT TO "authenticated" USING (((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('media.view'::"text", "workspace_id")) OR (("workspace_id" IS NULL) AND ("user_id" = "auth"."uid"()))));



CREATE POLICY "media_tags_update" ON "public"."media_tags" FOR UPDATE TO "authenticated" USING (((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('media.manage'::"text", "workspace_id")) OR (("workspace_id" IS NULL) AND ("user_id" = "auth"."uid"())))) WITH CHECK (((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('media.manage'::"text", "workspace_id")) OR (("workspace_id" IS NULL) AND ("user_id" = "auth"."uid"()))));



ALTER TABLE "public"."message_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "message_templates_delete" ON "public"."message_templates" FOR DELETE USING (((("workspace_id" IS NULL) AND ("auth"."uid"() = "user_id")) OR (("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('templates.delete'::"text", "workspace_id"))));



CREATE POLICY "message_templates_insert" ON "public"."message_templates" FOR INSERT WITH CHECK (((("workspace_id" IS NULL) AND ("auth"."uid"() = "user_id")) OR (("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('templates.create'::"text", "workspace_id"))));



CREATE POLICY "message_templates_select" ON "public"."message_templates" FOR SELECT USING (((("workspace_id" IS NULL) AND ("auth"."uid"() = "user_id")) OR (("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('templates.view'::"text", "workspace_id"))));



CREATE POLICY "message_templates_update" ON "public"."message_templates" FOR UPDATE USING (((("workspace_id" IS NULL) AND ("auth"."uid"() = "user_id")) OR (("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('templates.edit'::"text", "workspace_id")))) WITH CHECK (((("workspace_id" IS NULL) AND ("auth"."uid"() = "user_id")) OR (("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('templates.edit'::"text", "workspace_id"))));



ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."onboarding_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."policy_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_select_policy_versions" ON "public"."policy_versions" FOR SELECT USING (true);



CREATE POLICY "public_select_rate_limit_config" ON "public"."rate_limit_config" FOR SELECT USING (true);



ALTER TABLE "public"."rate_limit_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_limit_counters_v2" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_limit_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_limit_rules_v2" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_searches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scheduled_automations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_insert_webhook_validation_blocks" ON "public"."webhook_validation_blocks" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "service_role_manage_rate_limit_counters_v2" ON "public"."rate_limit_counters_v2" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "service_role_manage_rate_limit_rules_v2" ON "public"."rate_limit_rules_v2" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "service_role_manage_signed_url_cache" ON "public"."signed_url_cache" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."signed_url_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sli_metrics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sli_metrics_delete_service_role" ON "public"."sli_metrics" FOR DELETE TO "authenticated" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "sli_metrics_insert_service_role" ON "public"."sli_metrics" FOR INSERT TO "authenticated" WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "sli_metrics_select_authenticated" ON "public"."sli_metrics" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "sli_metrics_update_service_role" ON "public"."sli_metrics" FOR UPDATE TO "authenticated" USING (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."sync_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sync_events_insert_own" ON "public"."sync_events" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "sync_events_select_own" ON "public"."sync_events" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."template_installs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "template_installs_delete_own" ON "public"."template_installs" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "template_installs_insert_own" ON "public"."template_installs" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "template_installs_select_own" ON "public"."template_installs" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "template_installs_update_own" ON "public"."template_installs" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."template_ratings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "template_ratings_delete_own" ON "public"."template_ratings" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "template_ratings_insert_own" ON "public"."template_ratings" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "template_ratings_select_public_templates" ON "public"."template_ratings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."automation_templates" "t"
  WHERE (("t"."id" = "template_ratings"."template_id") AND (("t"."is_public" = true) OR ("t"."created_by" = "auth"."uid"()))))));



CREATE POLICY "template_ratings_update_own" ON "public"."template_ratings" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."trial_access" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."upload_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "upload_events_insert_own" ON "public"."upload_events" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "upload_events_select_own" ON "public"."upload_events" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_consents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_storage_quotas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_insert_own_contacts" ON "public"."contacts" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_select_own_consent_history" ON "public"."consent_history" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_select_own_deletion_requests" ON "public"."data_deletion_requests" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_select_own_export_requests" ON "public"."data_export_requests" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."webhook_circuit_breaker" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhook_circuit_breaker_select" ON "public"."webhook_circuit_breaker" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."webhooks" "w"
  WHERE (("w"."id" = "webhook_circuit_breaker"."webhook_id") AND ((("w"."workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("w"."workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.view'::"text", "w"."workspace_id")) OR (("w"."workspace_id" IS NULL) AND ("w"."user_id" = "auth"."uid"())))))));



ALTER TABLE "public"."webhook_conditions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhook_conditions_manage" ON "public"."webhook_conditions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."webhooks" "w"
  WHERE (("w"."id" = "webhook_conditions"."webhook_id") AND ((("w"."workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("w"."workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.edit'::"text", "w"."workspace_id")) OR (("w"."workspace_id" IS NULL) AND ("w"."user_id" = "auth"."uid"()))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."webhooks" "w"
  WHERE (("w"."id" = "webhook_conditions"."webhook_id") AND ((("w"."workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("w"."workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.edit'::"text", "w"."workspace_id")) OR (("w"."workspace_id" IS NULL) AND ("w"."user_id" = "auth"."uid"())))))));



ALTER TABLE "public"."webhook_domain_allowlist" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhook_domain_allowlist_delete" ON "public"."webhook_domain_allowlist" FOR DELETE USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.manage'::"text", "workspace_id")));



CREATE POLICY "webhook_domain_allowlist_insert" ON "public"."webhook_domain_allowlist" FOR INSERT WITH CHECK (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.manage'::"text", "workspace_id") AND ("created_by" = "auth"."uid"())));



CREATE POLICY "webhook_domain_allowlist_select" ON "public"."webhook_domain_allowlist" FOR SELECT USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.view'::"text", "workspace_id")));



CREATE POLICY "webhook_domain_allowlist_update" ON "public"."webhook_domain_allowlist" FOR UPDATE USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.manage'::"text", "workspace_id"))) WITH CHECK (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.manage'::"text", "workspace_id")));



ALTER TABLE "public"."webhook_jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhook_jobs_select" ON "public"."webhook_jobs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."webhooks" "w"
  WHERE (("w"."id" = "webhook_jobs"."webhook_id") AND (("w"."user_id" = "auth"."uid"()) OR (("w"."workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("w"."workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.view'::"text", "w"."workspace_id")))))));



CREATE POLICY "webhook_jobs_update_retry" ON "public"."webhook_jobs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."webhooks" "w"
  WHERE (("w"."id" = "webhook_jobs"."webhook_id") AND (("w"."user_id" = "auth"."uid"()) OR (("w"."workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("w"."workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.edit'::"text", "w"."workspace_id"))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."webhooks" "w"
  WHERE (("w"."id" = "webhook_jobs"."webhook_id") AND (("w"."user_id" = "auth"."uid"()) OR (("w"."workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("w"."workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.edit'::"text", "w"."workspace_id")))))));



ALTER TABLE "public"."webhook_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhook_logs_select" ON "public"."webhook_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."webhooks" "w"
  WHERE (("w"."id" = "webhook_logs"."webhook_id") AND ((("w"."workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("w"."workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.view'::"text", "w"."workspace_id")) OR (("w"."workspace_id" IS NULL) AND ("w"."user_id" = "auth"."uid"())))))));



ALTER TABLE "public"."webhook_rate_limit" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhook_rate_limit_select" ON "public"."webhook_rate_limit" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."webhooks" "w"
  WHERE (("w"."id" = "webhook_rate_limit"."webhook_id") AND ((("w"."workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("w"."workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.view'::"text", "w"."workspace_id")) OR (("w"."workspace_id" IS NULL) AND ("w"."user_id" = "auth"."uid"())))))));



ALTER TABLE "public"."webhook_retry_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhook_retry_config_manage" ON "public"."webhook_retry_config" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."webhooks" "w"
  WHERE (("w"."id" = "webhook_retry_config"."webhook_id") AND ((("w"."workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("w"."workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.manage'::"text", "w"."workspace_id")) OR (("w"."workspace_id" IS NULL) AND ("w"."user_id" = "auth"."uid"()))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."webhooks" "w"
  WHERE (("w"."id" = "webhook_retry_config"."webhook_id") AND ((("w"."workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("w"."workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.manage'::"text", "w"."workspace_id")) OR (("w"."workspace_id" IS NULL) AND ("w"."user_id" = "auth"."uid"())))))));



ALTER TABLE "public"."webhook_retry_queue" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhook_retry_queue_select" ON "public"."webhook_retry_queue" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."webhooks" "w"
  WHERE (("w"."id" = "webhook_retry_queue"."webhook_id") AND ((("w"."workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("w"."workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.view'::"text", "w"."workspace_id")) OR (("w"."workspace_id" IS NULL) AND ("w"."user_id" = "auth"."uid"())))))));



ALTER TABLE "public"."webhook_secrets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhook_secrets_delete" ON "public"."webhook_secrets" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."webhooks" "w"
  WHERE (("w"."id" = "webhook_secrets"."webhook_id") AND ((("w"."workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("w"."workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.manage'::"text", "w"."workspace_id")) OR (("w"."workspace_id" IS NULL) AND ("w"."user_id" = "auth"."uid"())))))));



CREATE POLICY "webhook_secrets_insert" ON "public"."webhook_secrets" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."webhooks" "w"
  WHERE (("w"."id" = "webhook_secrets"."webhook_id") AND ((("w"."workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("w"."workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.manage'::"text", "w"."workspace_id")) OR (("w"."workspace_id" IS NULL) AND ("w"."user_id" = "auth"."uid"())))))));



CREATE POLICY "webhook_secrets_select" ON "public"."webhook_secrets" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."webhooks" "w"
  WHERE (("w"."id" = "webhook_secrets"."webhook_id") AND ((("w"."workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("w"."workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.manage'::"text", "w"."workspace_id")) OR (("w"."workspace_id" IS NULL) AND ("w"."user_id" = "auth"."uid"())))))));



CREATE POLICY "webhook_secrets_update" ON "public"."webhook_secrets" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."webhooks" "w"
  WHERE (("w"."id" = "webhook_secrets"."webhook_id") AND ((("w"."workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("w"."workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.manage'::"text", "w"."workspace_id")) OR (("w"."workspace_id" IS NULL) AND ("w"."user_id" = "auth"."uid"()))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."webhooks" "w"
  WHERE (("w"."id" = "webhook_secrets"."webhook_id") AND ((("w"."workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("w"."workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.manage'::"text", "w"."workspace_id")) OR (("w"."workspace_id" IS NULL) AND ("w"."user_id" = "auth"."uid"())))))));



ALTER TABLE "public"."webhook_signature_nonces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhook_signature_nonces_service_role" ON "public"."webhook_signature_nonces" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."webhook_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webhook_validation_blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webhooks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhooks_delete" ON "public"."webhooks" FOR DELETE TO "authenticated" USING (((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.manage'::"text", "workspace_id")) OR (("workspace_id" IS NULL) AND ("user_id" = "auth"."uid"()))));



CREATE POLICY "webhooks_insert" ON "public"."webhooks" FOR INSERT TO "authenticated" WITH CHECK (((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.create'::"text", "workspace_id")) OR (("workspace_id" IS NULL) AND ("user_id" = "auth"."uid"()))));



CREATE POLICY "webhooks_select" ON "public"."webhooks" FOR SELECT TO "authenticated" USING (((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.view'::"text", "workspace_id")) OR (("workspace_id" IS NULL) AND ("user_id" = "auth"."uid"()))));



CREATE POLICY "webhooks_update" ON "public"."webhooks" FOR UPDATE TO "authenticated" USING (((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.edit'::"text", "workspace_id")) OR (("workspace_id" IS NULL) AND ("user_id" = "auth"."uid"())))) WITH CHECK (((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('webhooks.edit'::"text", "workspace_id")) OR (("workspace_id" IS NULL) AND ("user_id" = "auth"."uid"()))));



ALTER TABLE "public"."whatsapp_conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "whatsapp_conversations_delete" ON "public"."whatsapp_conversations" FOR DELETE TO "authenticated" USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('whatsapp.manage'::"text", "workspace_id")));



CREATE POLICY "whatsapp_conversations_manage" ON "public"."whatsapp_conversations" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('whatsapp.manage'::"text", "workspace_id")));



CREATE POLICY "whatsapp_conversations_select" ON "public"."whatsapp_conversations" FOR SELECT TO "authenticated" USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('whatsapp.view'::"text", "workspace_id")));



CREATE POLICY "whatsapp_conversations_update" ON "public"."whatsapp_conversations" FOR UPDATE TO "authenticated" USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('whatsapp.manage'::"text", "workspace_id"))) WITH CHECK (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('whatsapp.manage'::"text", "workspace_id")));



ALTER TABLE "public"."whatsapp_instances" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "whatsapp_instances_delete" ON "public"."whatsapp_instances" FOR DELETE TO "authenticated" USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('whatsapp.manage'::"text", "workspace_id")));



CREATE POLICY "whatsapp_instances_insert" ON "public"."whatsapp_instances" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('whatsapp.manage'::"text", "workspace_id")));



CREATE POLICY "whatsapp_instances_select" ON "public"."whatsapp_instances" FOR SELECT TO "authenticated" USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND ("public"."has_permission"('whatsapp.view'::"text", "workspace_id") OR "public"."has_permission"('whatsapp.manage'::"text", "workspace_id"))));



CREATE POLICY "whatsapp_instances_update" ON "public"."whatsapp_instances" FOR UPDATE TO "authenticated" USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('whatsapp.manage'::"text", "workspace_id"))) WITH CHECK (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('whatsapp.manage'::"text", "workspace_id")));



ALTER TABLE "public"."whatsapp_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "whatsapp_messages_insert" ON "public"."whatsapp_messages" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('whatsapp.manage'::"text", "workspace_id")));



CREATE POLICY "whatsapp_messages_select" ON "public"."whatsapp_messages" FOR SELECT TO "authenticated" USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('whatsapp.view'::"text", "workspace_id")));



ALTER TABLE "public"."workspace_invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workspace_invitations_select_if_member" ON "public"."workspace_invitations" FOR SELECT USING ("public"."is_workspace_member"("workspace_id", "auth"."uid"()));



CREATE POLICY "workspace_managers_select_webhook_validation_blocks" ON "public"."webhook_validation_blocks" FOR SELECT USING ((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('settings.manage'::"text", "workspace_id")));



ALTER TABLE "public"."workspace_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workspace_members_delete_automations" ON "public"."automations" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('automations.delete'::"text", "workspace_id"))));



CREATE POLICY "workspace_members_delete_contacts" ON "public"."contacts" FOR DELETE TO "authenticated" USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('contacts.delete'::"text", "workspace_id")));



CREATE POLICY "workspace_members_delete_media" ON "public"."media_library" FOR DELETE TO "authenticated" USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('media.manage'::"text", "workspace_id")));



CREATE POLICY "workspace_members_insert_analytics_events" ON "public"."analytics_events" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (("workspace_id" IS NULL) OR ("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('analytics.create'::"text", "workspace_id")))));



CREATE POLICY "workspace_members_insert_automations" ON "public"."automations" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('automations.create'::"text", "workspace_id")));



CREATE POLICY "workspace_members_insert_contacts" ON "public"."contacts" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('contacts.create'::"text", "workspace_id")));



CREATE POLICY "workspace_members_insert_media" ON "public"."media_library" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('media.upload'::"text", "workspace_id")));



CREATE POLICY "workspace_members_select_analytics_events" ON "public"."analytics_events" FOR SELECT TO "authenticated" USING ((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('analytics.view'::"text", "workspace_id")));



CREATE POLICY "workspace_members_select_audit_events" ON "public"."audit_events" FOR SELECT USING ("public"."is_workspace_member"("workspace_id", "auth"."uid"()));



CREATE POLICY "workspace_members_select_automations" ON "public"."automations" FOR SELECT TO "authenticated" USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('automations.view'::"text", "workspace_id")));



CREATE POLICY "workspace_members_select_contacts" ON "public"."contacts" FOR SELECT TO "authenticated" USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('contacts.view'::"text", "workspace_id")));



CREATE POLICY "workspace_members_select_if_same_workspace" ON "public"."workspace_members" FOR SELECT USING ("public"."is_workspace_member"("workspace_id", "auth"."uid"()));



CREATE POLICY "workspace_members_select_media" ON "public"."media_library" FOR SELECT TO "authenticated" USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('media.view'::"text", "workspace_id")));



CREATE POLICY "workspace_members_update_automations" ON "public"."automations" FOR UPDATE TO "authenticated" USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('automations.edit'::"text", "workspace_id"))) WITH CHECK (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('automations.edit'::"text", "workspace_id")));



CREATE POLICY "workspace_members_update_contacts" ON "public"."contacts" FOR UPDATE TO "authenticated" USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('contacts.edit'::"text", "workspace_id"))) WITH CHECK (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('contacts.edit'::"text", "workspace_id")));



CREATE POLICY "workspace_members_update_media" ON "public"."media_library" FOR UPDATE TO "authenticated" USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('media.manage'::"text", "workspace_id"))) WITH CHECK (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) AND "public"."has_permission"('media.manage'::"text", "workspace_id")));



ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workspaces_insert_owner" ON "public"."workspaces" FOR INSERT WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "workspaces_select_if_member" ON "public"."workspaces" FOR SELECT USING ("public"."is_workspace_member"("id", "auth"."uid"()));



CREATE POLICY "workspaces_update_owner_or_admin" ON "public"."workspaces" FOR UPDATE USING ((("owner_id" = "auth"."uid"()) OR "public"."workspace_has_permission"("id", 'workspace.settings.update'::"text"))) WITH CHECK ((("owner_id" = "auth"."uid"()) OR "public"."workspace_has_permission"("id", 'workspace.settings.update'::"text")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";












GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































































































































GRANT ALL ON FUNCTION "public"."add_tag_to_media"("p_media_id" "uuid", "p_tag_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."add_tag_to_media"("p_media_id" "uuid", "p_tag_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_tag_to_media"("p_media_id" "uuid", "p_tag_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_notification"("p_notification_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_notification"("p_notification_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_notification"("p_notification_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_automation_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_automation_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_automation_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_create_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_create_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_create_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."block_immutable_audit_log_mutations"() TO "anon";
GRANT ALL ON FUNCTION "public"."block_immutable_audit_log_mutations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."block_immutable_audit_log_mutations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_next_retry"("p_attempt_number" integer, "p_initial_delay" integer, "p_max_delay" integer, "p_multiplier" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_next_retry"("p_attempt_number" integer, "p_initial_delay" integer, "p_max_delay" integer, "p_multiplier" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_next_retry"("p_attempt_number" integer, "p_initial_delay" integer, "p_max_delay" integer, "p_multiplier" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_sli_automations"("p_window_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_sli_automations"("p_window_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_sli_automations"("p_window_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_sli_sync"("p_window_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_sli_sync"("p_window_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_sli_sync"("p_window_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_sli_uploads"("p_window_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_sli_uploads"("p_window_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_sli_uploads"("p_window_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_sli_webhooks"("p_window_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_sli_webhooks"("p_window_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_sli_webhooks"("p_window_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_whatsapp_health_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_whatsapp_health_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_whatsapp_health_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_execute_webhook"("p_webhook_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_execute_webhook"("p_webhook_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_execute_webhook"("p_webhook_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_account_deletion"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_account_deletion"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_account_deletion"("p_request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_permission"("required_permission" "public"."permission_type") TO "anon";
GRANT ALL ON FUNCTION "public"."check_permission"("required_permission" "public"."permission_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_permission"("required_permission" "public"."permission_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_endpoint" "text", "p_custom_max_requests" integer, "p_custom_window_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_endpoint" "text", "p_custom_max_requests" integer, "p_custom_window_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_endpoint" "text", "p_custom_max_requests" integer, "p_custom_window_seconds" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_rate_limit_v2"("p_endpoint" "text", "p_limit_type" "text", "p_identifier" "text", "p_tier" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_rate_limit_v2"("p_endpoint" "text", "p_limit_type" "text", "p_identifier" "text", "p_tier" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_rate_limit_v2"("p_endpoint" "text", "p_limit_type" "text", "p_identifier" "text", "p_tier" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rate_limit_v2"("p_endpoint" "text", "p_limit_type" "text", "p_identifier" "text", "p_tier" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_webhook_rate_limit"("p_webhook_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_webhook_rate_limit"("p_webhook_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_webhook_rate_limit"("p_webhook_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."webhook_jobs" TO "anon";
GRANT ALL ON TABLE "public"."webhook_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_jobs" TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_webhook_jobs"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."claim_webhook_jobs"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_webhook_jobs"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_expired_data"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_expired_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_exports"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_exports"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_exports"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_rate_limit_events"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_rate_limit_events"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_rate_limit_events"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_rate_limits"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_rate_limits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_rate_limits"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_retries"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_retries"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_retries"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_webhook_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_webhook_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_webhook_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_onboarding_step"("p_step_id" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_onboarding_step"("p_step_id" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_onboarding_step"("p_step_id" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."consume_analysis_quota"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."contacts_add_tags"("p_contact_ids" "uuid"[], "p_tags" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."contacts_add_tags"("p_contact_ids" "uuid"[], "p_tags" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."contacts_add_tags"("p_contact_ids" "uuid"[], "p_tags" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."contacts_change_status"("p_contact_ids" "uuid"[], "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."contacts_change_status"("p_contact_ids" "uuid"[], "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."contacts_change_status"("p_contact_ids" "uuid"[], "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."contacts_delete"("p_contact_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."contacts_delete"("p_contact_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."contacts_delete"("p_contact_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."contacts_remove_tags"("p_contact_ids" "uuid"[], "p_tags" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."contacts_remove_tags"("p_contact_ids" "uuid"[], "p_tags" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."contacts_remove_tags"("p_contact_ids" "uuid"[], "p_tags" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."contacts_search_vector_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."contacts_search_vector_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."contacts_search_vector_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_automation_version"("p_automation_id" "uuid", "p_doc" "jsonb", "p_change_summary" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_automation_version"("p_automation_id" "uuid", "p_doc" "jsonb", "p_change_summary" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_automation_version"("p_automation_id" "uuid", "p_doc" "jsonb", "p_change_summary" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_export_job"("p_export_type" "text", "p_format" "public"."export_format", "p_filters" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_export_job"("p_export_type" "text", "p_format" "public"."export_format", "p_filters" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_export_job"("p_export_type" "text", "p_format" "public"."export_format", "p_filters" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_priority" "public"."notification_priority", "p_action_url" "text", "p_action_label" "text", "p_metadata" "jsonb", "p_expires_in_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_priority" "public"."notification_priority", "p_action_url" "text", "p_action_label" "text", "p_metadata" "jsonb", "p_expires_in_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_priority" "public"."notification_priority", "p_action_url" "text", "p_action_label" "text", "p_metadata" "jsonb", "p_expires_in_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification_preferences"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification_preferences"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification_preferences"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_webhook_secret_once"("p_webhook_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_webhook_secret_once"("p_webhook_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_webhook_secret_once"("p_webhook_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrypt_webhook_secret"("p_encrypted_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."decrypt_webhook_secret"("p_encrypted_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrypt_webhook_secret"("p_encrypted_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."encrypt_webhook_secret"("p_secret_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."encrypt_webhook_secret"("p_secret_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."encrypt_webhook_secret"("p_secret_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_rating_requires_install"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_rating_requires_install"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_rating_requires_install"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enqueue_webhook_job"("p_webhook_id" "uuid", "p_event_type" "text", "p_payload" "jsonb", "p_max_retries" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."enqueue_webhook_job"("p_webhook_id" "uuid", "p_event_type" "text", "p_payload" "jsonb", "p_max_retries" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."enqueue_webhook_job"("p_webhook_id" "uuid", "p_event_type" "text", "p_payload" "jsonb", "p_max_retries" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."enqueue_webhook_retry"("p_webhook_id" "uuid", "p_webhook_log_id" "uuid", "p_event_type" "text", "p_payload" "jsonb", "p_status_code" integer, "p_error_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."enqueue_webhook_retry"("p_webhook_id" "uuid", "p_webhook_log_id" "uuid", "p_event_type" "text", "p_payload" "jsonb", "p_status_code" integer, "p_error_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."enqueue_webhook_retry"("p_webhook_id" "uuid", "p_webhook_log_id" "uuid", "p_event_type" "text", "p_payload" "jsonb", "p_status_code" integer, "p_error_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_primary_workspace_membership"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_primary_workspace_membership"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_primary_workspace_membership"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_user_storage_quota"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_user_storage_quota"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_user_storage_quota"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."evaluate_webhook_conditions"("p_webhook_id" "uuid", "p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."evaluate_webhook_conditions"("p_webhook_id" "uuid", "p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."evaluate_webhook_conditions"("p_webhook_id" "uuid", "p_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_master_key_bytes"("p_key_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_master_key_bytes"("p_key_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_master_key_bytes"("p_key_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_automation_performance_by_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_automation_performance_by_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_automation_performance_by_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_cloud_integration_tokens"("p_provider" "public"."cloud_provider") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_cloud_integration_tokens"("p_provider" "public"."cloud_provider") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cloud_integration_tokens"("p_provider" "public"."cloud_provider") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cloud_integration_tokens"("p_provider" "public"."cloud_provider") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_feature_adoption"("p_workspace_id" "uuid", "p_days" integer, "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_feature_adoption"("p_workspace_id" "uuid", "p_days" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_feature_adoption"("p_workspace_id" "uuid", "p_days" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_feature_adoption"("p_workspace_id" "uuid", "p_days" integer, "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_funnel_step_counts"("p_workspace_id" "uuid", "p_steps" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_funnel_step_counts"("p_workspace_id" "uuid", "p_steps" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_funnel_step_counts"("p_workspace_id" "uuid", "p_steps" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_funnel_step_counts"("p_workspace_id" "uuid", "p_steps" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_global_webhook_analytics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_global_webhook_analytics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_global_webhook_analytics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_media_analytics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_media_analytics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_media_analytics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_media_for_export"("p_filters" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."get_media_for_export"("p_filters" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_media_for_export"("p_filters" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_media_largest_files"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_media_largest_files"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_media_largest_files"("p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_media_top_tags"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_media_top_tags"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_media_top_tags"("p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_media_upload_trend"("p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_media_upload_trend"("p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_media_upload_trend"("p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_onboarding_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_onboarding_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_onboarding_status"() TO "service_role";



GRANT ALL ON TABLE "public"."webhook_retry_queue" TO "anon";
GRANT ALL ON TABLE "public"."webhook_retry_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_retry_queue" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_retries"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_retries"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_retries"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_product_kpis"("p_workspace_id" "uuid", "p_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_product_kpis"("p_workspace_id" "uuid", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_kpis"("p_workspace_id" "uuid", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_kpis"("p_workspace_id" "uuid", "p_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_retention_cohorts"("p_workspace_id" "uuid", "p_lookback_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_retention_cohorts"("p_workspace_id" "uuid", "p_lookback_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_retention_cohorts"("p_workspace_id" "uuid", "p_lookback_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_retention_cohorts"("p_workspace_id" "uuid", "p_lookback_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_slow_queries"("limit_rows" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_slow_queries"("limit_rows" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_slow_queries"("limit_rows" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_slow_queries"("limit_rows" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_storage_stats_by_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_storage_stats_by_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_storage_stats_by_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_webhook_analytics"("p_webhook_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_webhook_analytics"("p_webhook_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_webhook_analytics"("p_webhook_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."webhook_circuit_breaker" TO "anon";
GRANT ALL ON TABLE "public"."webhook_circuit_breaker" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_circuit_breaker" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_logs" TO "anon";
GRANT ALL ON TABLE "public"."webhook_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_logs" TO "service_role";



GRANT ALL ON TABLE "public"."webhooks" TO "anon";
GRANT ALL ON TABLE "public"."webhooks" TO "authenticated";
GRANT ALL ON TABLE "public"."webhooks" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_analytics_summary" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_webhook_analytics_summaries"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_webhook_analytics_summaries"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_webhook_analytics_summaries"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_webhook_deliveries_by_day"("p_webhook_id" "uuid", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_webhook_deliveries_by_day"("p_webhook_id" "uuid", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_webhook_deliveries_by_day"("p_webhook_id" "uuid", "p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_webhook_health_check"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_webhook_health_check"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_webhook_health_check"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_webhook_latency_percentiles"("p_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_webhook_latency_percentiles"("p_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_webhook_latency_percentiles"("p_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_webhook_secret_for_delivery"("p_webhook_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_webhook_secret_for_delivery"("p_webhook_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_webhook_secret_for_delivery"("p_webhook_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_webhook_secrets_for_delivery"("p_webhook_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_webhook_secrets_for_delivery"("p_webhook_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_webhook_secrets_for_delivery"("p_webhook_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_webhook_stats_by_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_webhook_stats_by_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_webhook_stats_by_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_webhook_status_code_distribution"("p_webhook_id" "uuid", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_webhook_status_code_distribution"("p_webhook_id" "uuid", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_webhook_status_code_distribution"("p_webhook_id" "uuid", "p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_webhook_top_events"("p_webhook_id" "uuid", "p_days" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_webhook_top_events"("p_webhook_id" "uuid", "p_days" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_webhook_top_events"("p_webhook_id" "uuid", "p_days" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_webhook_uptime_daily"("p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_webhook_uptime_daily"("p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_webhook_uptime_daily"("p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_webhook_uptime_hourly"("p_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_webhook_uptime_hourly"("p_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_webhook_uptime_hourly"("p_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."global_search"("p_query" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."global_search"("p_query" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."global_search"("p_query" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."has_permission"("permission_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_permission"("permission_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission"("permission_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_permission"("permission_name" "text", "workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_permission"("permission_name" "text", "workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission"("permission_name" "text", "workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_template_use_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_template_use_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_template_use_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_allowed_consent_type"("p_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_allowed_consent_type"("p_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_allowed_consent_type"("p_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_workspace_member"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_workspace_member"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_workspace_member"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_audit_event"("p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb", "p_user_agent" "text", "p_session_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_audit_event"("p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb", "p_user_agent" "text", "p_session_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_audit_event"("p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb", "p_user_agent" "text", "p_session_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_conversation_as_read"("p_conversation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_conversation_as_read"("p_conversation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_conversation_as_read"("p_conversation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."move_media_to_folder"("p_media_ids" "uuid"[], "p_folder_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."move_media_to_folder"("p_media_ids" "uuid"[], "p_folder_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."move_media_to_folder"("p_media_ids" "uuid"[], "p_folder_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_permission_name"("p" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_permission_name"("p" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_permission_name"("p" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_phone"("phone_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_phone"("phone_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_phone"("phone_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_circuit_breaker_open"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_circuit_breaker_open"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_circuit_breaker_open"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_data_deletion_approved"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_data_deletion_approved"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_data_deletion_approved"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_storage_quota"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_storage_quota"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_storage_quota"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_webhook_failures"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_webhook_failures"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_webhook_failures"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_plaintext_webhook_secret"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_plaintext_webhook_secret"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_plaintext_webhook_secret"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_data_deletion"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_data_deletion"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_data_deletion"("p_request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_retry_result"("p_retry_id" "uuid", "p_success" boolean, "p_status_code" integer, "p_error_message" "text", "p_response_body" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_retry_result"("p_retry_id" "uuid", "p_success" boolean, "p_status_code" integer, "p_error_message" "text", "p_response_body" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_retry_result"("p_retry_id" "uuid", "p_success" boolean, "p_status_code" integer, "p_error_message" "text", "p_response_body" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."publish_automation_version"("p_automation_id" "uuid", "p_version_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."publish_automation_version"("p_automation_id" "uuid", "p_version_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."publish_automation_version"("p_automation_id" "uuid", "p_version_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."purge_dead_webhook_jobs"("p_older_than_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."purge_dead_webhook_jobs"("p_older_than_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."purge_dead_webhook_jobs"("p_older_than_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."purge_expired_webhook_signature_nonces"() TO "anon";
GRANT ALL ON FUNCTION "public"."purge_expired_webhook_signature_nonces"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."purge_expired_webhook_signature_nonces"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recompute_template_rating_avg"() TO "anon";
GRANT ALL ON FUNCTION "public"."recompute_template_rating_avg"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_template_rating_avg"() TO "service_role";



GRANT ALL ON FUNCTION "public"."record_consent"("p_consent_type" "text", "p_policy_version" "text", "p_granted" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."record_consent"("p_consent_type" "text", "p_policy_version" "text", "p_granted" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_consent"("p_consent_type" "text", "p_policy_version" "text", "p_granted" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."record_webhook_execution"("p_webhook_id" "uuid", "p_success" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."record_webhook_execution"("p_webhook_id" "uuid", "p_success" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_webhook_execution"("p_webhook_id" "uuid", "p_success" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_materialized_views"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_materialized_views"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_materialized_views"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_media_analytics"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_media_analytics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_media_analytics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_webhook_analytics"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_webhook_analytics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_webhook_analytics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_tag_from_media"("p_media_id" "uuid", "p_tag_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_tag_from_media"("p_media_id" "uuid", "p_tag_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_tag_from_media"("p_media_id" "uuid", "p_tag_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_account_deletion"("p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."request_account_deletion"("p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_account_deletion"("p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_data_export"() TO "anon";
GRANT ALL ON FUNCTION "public"."request_data_export"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_data_export"() TO "service_role";



GRANT ALL ON FUNCTION "public"."revoke_all_consents"() TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_all_consents"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_all_consents"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rollback_automation_version"("p_automation_id" "uuid", "p_target_version_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rollback_automation_version"("p_automation_id" "uuid", "p_target_version_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rollback_automation_version"("p_automation_id" "uuid", "p_target_version_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rotate_due_webhook_secrets"("p_rotation_days" integer, "p_grace_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."rotate_due_webhook_secrets"("p_rotation_days" integer, "p_grace_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rotate_due_webhook_secrets"("p_rotation_days" integer, "p_grace_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_contacts"("p_query" "text", "p_tags" "text"[], "p_status" "text", "p_created_after" timestamp with time zone, "p_created_before" timestamp with time zone, "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_contacts"("p_query" "text", "p_tags" "text"[], "p_status" "text", "p_created_after" timestamp with time zone, "p_created_before" timestamp with time zone, "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_contacts"("p_query" "text", "p_tags" "text"[], "p_status" "text", "p_created_after" timestamp with time zone, "p_created_before" timestamp with time zone, "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_media"("p_query" "text", "p_file_types" "text"[], "p_mime_types" "text"[], "p_folder_ids" "uuid"[], "p_tag_ids" "uuid"[], "p_min_size" bigint, "p_max_size" bigint, "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_media"("p_query" "text", "p_file_types" "text"[], "p_mime_types" "text"[], "p_folder_ids" "uuid"[], "p_tag_ids" "uuid"[], "p_min_size" bigint, "p_max_size" bigint, "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_media"("p_query" "text", "p_file_types" "text"[], "p_mime_types" "text"[], "p_folder_ids" "uuid"[], "p_tag_ids" "uuid"[], "p_min_size" bigint, "p_max_size" bigint, "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_webhooks"("p_query" "text", "p_is_active" boolean, "p_events" "text"[], "p_has_failures" boolean, "p_circuit_state" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_webhooks"("p_query" "text", "p_is_active" boolean, "p_events" "text"[], "p_has_failures" boolean, "p_circuit_state" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_webhooks"("p_query" "text", "p_is_active" boolean, "p_events" "text"[], "p_has_failures" boolean, "p_circuit_state" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."track_analytics_event"("p_event_type" "text", "p_properties" "jsonb", "p_session_id" "text", "p_automation_id" "uuid", "p_contact_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."track_analytics_event"("p_event_type" "text", "p_properties" "jsonb", "p_session_id" "text", "p_automation_id" "uuid", "p_contact_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_analytics_event"("p_event_type" "text", "p_properties" "jsonb", "p_session_id" "text", "p_automation_id" "uuid", "p_contact_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."track_analytics_event"("p_event_type" "text", "p_properties" "jsonb", "p_session_id" "text", "p_automation_id" "uuid", "p_contact_id" "uuid", "p_workspace_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."track_analytics_event"("p_event_type" "text", "p_properties" "jsonb", "p_session_id" "text", "p_automation_id" "uuid", "p_contact_id" "uuid", "p_workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."track_analytics_event"("p_event_type" "text", "p_properties" "jsonb", "p_session_id" "text", "p_automation_id" "uuid", "p_contact_id" "uuid", "p_workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_analytics_event"("p_event_type" "text", "p_properties" "jsonb", "p_session_id" "text", "p_automation_id" "uuid", "p_contact_id" "uuid", "p_workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_normalize_phone"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_normalize_phone"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_normalize_phone"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_webhook"("p_webhook_id" "uuid", "p_event_type" "text", "p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_webhook"("p_webhook_id" "uuid", "p_event_type" "text", "p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_webhook"("p_webhook_id" "uuid", "p_event_type" "text", "p_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_storage_quota"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_storage_quota"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_storage_quota"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_consent"("p_consent_type" "text", "p_granted" boolean, "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_consent"("p_consent_type" "text", "p_granted" boolean, "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_consent"("p_consent_type" "text", "p_granted" boolean, "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_whatsapp_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_whatsapp_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_whatsapp_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."upsert_cloud_integration_tokens"("p_provider" "public"."cloud_provider", "p_access_token" "text", "p_refresh_token" "text", "p_expires_at" timestamp with time zone, "p_folder_id" "text", "p_folder_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_cloud_integration_tokens"("p_provider" "public"."cloud_provider", "p_access_token" "text", "p_refresh_token" "text", "p_expires_at" timestamp with time zone, "p_folder_id" "text", "p_folder_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_cloud_integration_tokens"("p_provider" "public"."cloud_provider", "p_access_token" "text", "p_refresh_token" "text", "p_expires_at" timestamp with time zone, "p_folder_id" "text", "p_folder_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_cloud_integration_tokens"("p_provider" "public"."cloud_provider", "p_access_token" "text", "p_refresh_token" "text", "p_expires_at" timestamp with time zone, "p_folder_id" "text", "p_folder_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_contact_from_whatsapp"("p_workspace_id" "uuid", "p_phone" "text", "p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_contact_from_whatsapp"("p_workspace_id" "uuid", "p_phone" "text", "p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_contact_from_whatsapp"("p_workspace_id" "uuid", "p_phone" "text", "p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_whatsapp_conversation"("p_whatsapp_instance_id" "uuid", "p_workspace_id" "uuid", "p_contact_id" "uuid", "p_last_message_content" "text", "p_last_message_from_me" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_whatsapp_conversation"("p_whatsapp_instance_id" "uuid", "p_workspace_id" "uuid", "p_contact_id" "uuid", "p_last_message_content" "text", "p_last_message_from_me" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_whatsapp_conversation"("p_whatsapp_instance_id" "uuid", "p_workspace_id" "uuid", "p_contact_id" "uuid", "p_last_message_content" "text", "p_last_message_from_me" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."use_saved_search"("p_search_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."use_saved_search"("p_search_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."use_saved_search"("p_search_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_contacts_ai_review_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_contacts_ai_review_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_contacts_ai_review_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_invitation_expires_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_invitation_expires_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_invitation_expires_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."workspace_has_permission"("p_workspace_id" "uuid", "p_permission" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."workspace_has_permission"("p_workspace_id" "uuid", "p_permission" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."workspace_has_permission"("p_workspace_id" "uuid", "p_permission" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."workspace_user_role"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."workspace_user_role"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."workspace_user_role"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "service_role";
























GRANT ALL ON TABLE "public"."analytics_events" TO "anon";
GRANT ALL ON TABLE "public"."analytics_events" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_events" TO "service_role";



GRANT ALL ON TABLE "public"."automations" TO "anon";
GRANT ALL ON TABLE "public"."automations" TO "authenticated";
GRANT ALL ON TABLE "public"."automations" TO "service_role";



GRANT ALL ON TABLE "public"."automation_metrics" TO "anon";
GRANT ALL ON TABLE "public"."automation_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."automation_metrics" TO "service_role";



GRANT ALL ON TABLE "private"."automation_performance" TO "anon";
GRANT ALL ON TABLE "private"."automation_performance" TO "authenticated";
GRANT ALL ON TABLE "private"."automation_performance" TO "service_role";



GRANT ALL ON TABLE "public"."media_library" TO "anon";
GRANT ALL ON TABLE "public"."media_library" TO "authenticated";
GRANT ALL ON TABLE "public"."media_library" TO "service_role";



GRANT ALL ON TABLE "private"."storage_stats_by_user" TO "anon";
GRANT ALL ON TABLE "private"."storage_stats_by_user" TO "authenticated";
GRANT ALL ON TABLE "private"."storage_stats_by_user" TO "service_role";



GRANT ALL ON TABLE "private"."webhook_stats_by_user" TO "anon";
GRANT ALL ON TABLE "private"."webhook_stats_by_user" TO "authenticated";
GRANT ALL ON TABLE "private"."webhook_stats_by_user" TO "service_role";



GRANT ALL ON TABLE "public"."alert_configs" TO "anon";
GRANT ALL ON TABLE "public"."alert_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."alert_configs" TO "service_role";



GRANT ALL ON TABLE "public"."alert_history" TO "anon";
GRANT ALL ON TABLE "public"."alert_history" TO "authenticated";
GRANT ALL ON TABLE "public"."alert_history" TO "service_role";



GRANT ALL ON TABLE "public"."app_encryption_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."app_encryption_keys" TO "service_role";



GRANT ALL ON TABLE "public"."audit_events" TO "anon";
GRANT ALL ON TABLE "public"."audit_events" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_events" TO "service_role";



GRANT ALL ON TABLE "public"."automation_execution_events" TO "anon";
GRANT ALL ON TABLE "public"."automation_execution_events" TO "authenticated";
GRANT ALL ON TABLE "public"."automation_execution_events" TO "service_role";



GRANT ALL ON TABLE "public"."automation_templates" TO "anon";
GRANT ALL ON TABLE "public"."automation_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."automation_templates" TO "service_role";



GRANT ALL ON TABLE "public"."automation_variables" TO "anon";
GRANT ALL ON TABLE "public"."automation_variables" TO "authenticated";
GRANT ALL ON TABLE "public"."automation_variables" TO "service_role";



GRANT ALL ON TABLE "public"."automation_versions" TO "anon";
GRANT ALL ON TABLE "public"."automation_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."automation_versions" TO "service_role";



GRANT ALL ON TABLE "public"."circuit_breaker_config" TO "anon";
GRANT ALL ON TABLE "public"."circuit_breaker_config" TO "authenticated";
GRANT ALL ON TABLE "public"."circuit_breaker_config" TO "service_role";



GRANT ALL ON TABLE "public"."cleanup_logs" TO "anon";
GRANT ALL ON TABLE "public"."cleanup_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."cleanup_logs" TO "service_role";



GRANT ALL ON TABLE "public"."cleanup_metrics" TO "anon";
GRANT ALL ON TABLE "public"."cleanup_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."cleanup_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."cloud_integrations" TO "anon";
GRANT ALL ON TABLE "public"."cloud_integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."cloud_integrations" TO "service_role";



GRANT ALL ON TABLE "public"."cloud_sync_history" TO "anon";
GRANT ALL ON TABLE "public"."cloud_sync_history" TO "authenticated";
GRANT ALL ON TABLE "public"."cloud_sync_history" TO "service_role";



GRANT ALL ON TABLE "public"."consent_history" TO "anon";
GRANT ALL ON TABLE "public"."consent_history" TO "authenticated";
GRANT ALL ON TABLE "public"."consent_history" TO "service_role";



GRANT ALL ON TABLE "public"."contacts" TO "anon";
GRANT ALL ON TABLE "public"."contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."contacts" TO "service_role";



GRANT ALL ON TABLE "public"."cookie_preferences" TO "anon";
GRANT ALL ON TABLE "public"."cookie_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."cookie_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."data_deletion_requests" TO "anon";
GRANT ALL ON TABLE "public"."data_deletion_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."data_deletion_requests" TO "service_role";



GRANT ALL ON TABLE "public"."data_export_requests" TO "anon";
GRANT ALL ON TABLE "public"."data_export_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."data_export_requests" TO "service_role";



GRANT ALL ON TABLE "public"."data_retention_policies" TO "anon";
GRANT ALL ON TABLE "public"."data_retention_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."data_retention_policies" TO "service_role";



GRANT ALL ON TABLE "public"."entity_comment_reads" TO "anon";
GRANT ALL ON TABLE "public"."entity_comment_reads" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_comment_reads" TO "service_role";



GRANT ALL ON TABLE "public"."entity_comments" TO "anon";
GRANT ALL ON TABLE "public"."entity_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_comments" TO "service_role";



GRANT ALL ON TABLE "public"."export_jobs" TO "anon";
GRANT ALL ON TABLE "public"."export_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."export_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."immutable_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."immutable_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."immutable_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."market_competitor_analyses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."market_competitor_analyses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."market_competitor_analyses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."market_competitor_analyses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."market_price_alerts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."market_price_alerts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."market_price_alerts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."market_price_alerts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."market_usage_daily" TO "service_role";



GRANT ALL ON TABLE "public"."market_user_plans" TO "service_role";



GRANT ALL ON TABLE "public"."market_watchlist" TO "service_role";



GRANT ALL ON SEQUENCE "public"."market_watchlist_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."market_watchlist_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."market_watchlist_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."media_analytics_summary" TO "service_role";



GRANT ALL ON TABLE "public"."media_folders" TO "anon";
GRANT ALL ON TABLE "public"."media_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."media_folders" TO "service_role";



GRANT ALL ON TABLE "public"."media_tag_assignments" TO "anon";
GRANT ALL ON TABLE "public"."media_tag_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."media_tag_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."media_tags" TO "anon";
GRANT ALL ON TABLE "public"."media_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."media_tags" TO "service_role";



GRANT ALL ON TABLE "public"."message_templates" TO "anon";
GRANT ALL ON TABLE "public"."message_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."message_templates" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."onboarding_progress" TO "anon";
GRANT ALL ON TABLE "public"."onboarding_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."onboarding_progress" TO "service_role";



GRANT ALL ON TABLE "public"."policy_versions" TO "anon";
GRANT ALL ON TABLE "public"."policy_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_versions" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limit_config" TO "anon";
GRANT ALL ON TABLE "public"."rate_limit_config" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limit_config" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limit_counters_v2" TO "anon";
GRANT ALL ON TABLE "public"."rate_limit_counters_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limit_counters_v2" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limit_events" TO "anon";
GRANT ALL ON TABLE "public"."rate_limit_events" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limit_events" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limit_rules_v2" TO "anon";
GRANT ALL ON TABLE "public"."rate_limit_rules_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limit_rules_v2" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."saved_searches" TO "anon";
GRANT ALL ON TABLE "public"."saved_searches" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_searches" TO "service_role";



GRANT ALL ON TABLE "public"."scheduled_automations" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_automations" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_automations" TO "service_role";



GRANT ALL ON TABLE "public"."signed_url_cache" TO "anon";
GRANT ALL ON TABLE "public"."signed_url_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."signed_url_cache" TO "service_role";



GRANT ALL ON TABLE "public"."sli_metrics" TO "anon";
GRANT ALL ON TABLE "public"."sli_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."sli_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."sync_events" TO "anon";
GRANT ALL ON TABLE "public"."sync_events" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_events" TO "service_role";



GRANT ALL ON TABLE "public"."template_installs" TO "anon";
GRANT ALL ON TABLE "public"."template_installs" TO "authenticated";
GRANT ALL ON TABLE "public"."template_installs" TO "service_role";



GRANT ALL ON TABLE "public"."template_ratings" TO "anon";
GRANT ALL ON TABLE "public"."template_ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."template_ratings" TO "service_role";



GRANT ALL ON TABLE "public"."trial_access" TO "anon";
GRANT ALL ON TABLE "public"."trial_access" TO "authenticated";
GRANT ALL ON TABLE "public"."trial_access" TO "service_role";



GRANT ALL ON TABLE "public"."upload_events" TO "anon";
GRANT ALL ON TABLE "public"."upload_events" TO "authenticated";
GRANT ALL ON TABLE "public"."upload_events" TO "service_role";



GRANT ALL ON TABLE "public"."user_consents" TO "anon";
GRANT ALL ON TABLE "public"."user_consents" TO "authenticated";
GRANT ALL ON TABLE "public"."user_consents" TO "service_role";



GRANT ALL ON TABLE "public"."user_funnel_metrics" TO "anon";
GRANT ALL ON TABLE "public"."user_funnel_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."user_funnel_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_storage_quotas" TO "anon";
GRANT ALL ON TABLE "public"."user_storage_quotas" TO "authenticated";
GRANT ALL ON TABLE "public"."user_storage_quotas" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_conditions" TO "anon";
GRANT ALL ON TABLE "public"."webhook_conditions" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_conditions" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_domain_allowlist" TO "anon";
GRANT ALL ON TABLE "public"."webhook_domain_allowlist" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_domain_allowlist" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_rate_limit" TO "anon";
GRANT ALL ON TABLE "public"."webhook_rate_limit" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_rate_limit" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_retry_config" TO "anon";
GRANT ALL ON TABLE "public"."webhook_retry_config" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_retry_config" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_secrets" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."webhook_secrets" TO "authenticated";



GRANT SELECT("webhook_id") ON TABLE "public"."webhook_secrets" TO "authenticated";



GRANT SELECT("secret_last4") ON TABLE "public"."webhook_secrets" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."webhook_secrets" TO "authenticated";



GRANT SELECT("rotated_at") ON TABLE "public"."webhook_secrets" TO "authenticated";



GRANT SELECT("expires_at") ON TABLE "public"."webhook_secrets" TO "authenticated";



GRANT SELECT("grace_expires_at") ON TABLE "public"."webhook_secrets" TO "authenticated";



GRANT SELECT("active") ON TABLE "public"."webhook_secrets" TO "authenticated";



GRANT ALL ON TABLE "public"."webhook_signature_nonces" TO "anon";
GRANT ALL ON TABLE "public"."webhook_signature_nonces" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_signature_nonces" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_templates" TO "anon";
GRANT ALL ON TABLE "public"."webhook_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_templates" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_validation_blocks" TO "anon";
GRANT ALL ON TABLE "public"."webhook_validation_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_validation_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_conversations" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_health_metrics" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_health_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_health_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_instances" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_instances" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_instances" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_messages" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_messages" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_invitations" TO "anon";
GRANT ALL ON TABLE "public"."workspace_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_members" TO "anon";
GRANT ALL ON TABLE "public"."workspace_members" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_members" TO "service_role";



GRANT ALL ON TABLE "public"."workspaces" TO "anon";
GRANT ALL ON TABLE "public"."workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."workspaces" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































