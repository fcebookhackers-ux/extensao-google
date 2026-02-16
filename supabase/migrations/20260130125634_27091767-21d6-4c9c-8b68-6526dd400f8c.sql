-- Enable required extensions for scheduled jobs
-- pg_cron provides schema cron.schedule(...)
-- pg_net enables http calls if needed later

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;