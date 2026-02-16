-- Reinstall extensions into `extensions` schema (pg_cron doesn't support SET SCHEMA)
CREATE SCHEMA IF NOT EXISTS extensions;

-- NOTE: dropping pg_cron will remove any existing cron jobs.
-- If you already have jobs configured, tell me before running this.
DROP EXTENSION IF EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- pg_net usually supports being installed in extensions schema too
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
