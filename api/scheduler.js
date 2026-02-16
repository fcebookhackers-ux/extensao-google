import cron from "node-cron";

function getRefreshHours() {
  const configured = Number(process.env.AUTO_REFRESH_HOURS ?? 5);
  if (!Number.isFinite(configured)) return 5;
  if (configured < 4 || configured > 6) return 5;
  return configured;
}

export function startAutoRefresh({ supabase, enqueueRefresh }) {
  if (!supabase || !enqueueRefresh) {
    return { stop: () => undefined };
  }

  const intervalHours = getRefreshHours();
  const expression = `0 */${intervalHours} * * *`;

  const runCycle = async () => {
    let data = [];
    const watchlistResult = await supabase
      .from("market_watchlist")
      .select("source_url, user_id, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!watchlistResult.error && (watchlistResult.data?.length ?? 0) > 0) {
      data = watchlistResult.data ?? [];
    } else {
      const historyResult = await supabase
        .from("market_competitor_analyses")
        .select("source_url, user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (historyResult.error) {
        console.error("auto-refresh: failed to load source urls", historyResult.error.message);
        return;
      }
      data = historyResult.data ?? [];
    }

    const seen = new Set();
    const recentUrls = [];
    for (const row of data) {
      const url = row.source_url;
      const userId = row.user_id ?? null;
      const key = `${userId ?? "none"}|${url}`;
      if (!url || seen.has(key)) continue;
      seen.add(key);
      recentUrls.push({ url, userId });
      if (recentUrls.length >= 20) break;
    }

    for (const entry of recentUrls) {
      if (!entry.userId) continue;
      try {
        // If userId is null (legacy rows), skip quota and just keep history warm.
        await enqueueRefresh(entry.url, "scheduled", entry.userId);
      } catch (err) {
        console.error(
          "auto-refresh: enqueue failed",
          entry.url,
          err instanceof Error ? err.message : err
        );
      }
    }
  };

  const task = cron.schedule(expression, () => {
    runCycle().catch((err) => {
      console.error("auto-refresh: cycle failed", err instanceof Error ? err.message : err);
    });
  });

  runCycle().catch((err) => {
    console.error("auto-refresh: initial cycle failed", err instanceof Error ? err.message : err);
  });

  return {
    stop() {
      task.stop();
      task.destroy();
    }
  };
}
