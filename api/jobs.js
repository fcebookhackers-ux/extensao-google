import IORedis from "ioredis";
import { Queue, Worker, QueueEvents } from "bullmq";

const QUEUE_NAME = "market-analysis";
const DEFAULT_TIMEOUT_MS = 120000;
const RESULT_TTL_MS = 30 * 60 * 1000;

const recentResults = new Map();

function rememberResult(jobId, status, payload) {
  recentResults.set(jobId, {
    status,
    payload,
    expiresAt: Date.now() + RESULT_TTL_MS
  });
}

function readRememberedResult(jobId) {
  const entry = recentResults.get(jobId);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    recentResults.delete(jobId);
    return null;
  }
  return entry;
}

function startResultGarbageCollector() {
  return setInterval(() => {
    for (const [jobId, entry] of recentResults) {
      if (entry.expiresAt <= Date.now()) recentResults.delete(jobId);
    }
  }, 60000);
}

export function createAnalysisJobs(processAnalysis) {
  const redisUrl = process.env.REDIS_URL ?? "";
  if (!redisUrl) {
    return {
      enabled: false,
      async enqueueAndWait(url, reason = "inline", userId = null) {
        const data = await processAnalysis(url, reason, userId);
        return { jobId: `inline-${Date.now()}`, data };
      },
      async enqueue(url, reason = "inline", userId = null) {
        const jobId = `inline-${Date.now()}`;
        const data = await processAnalysis(url, reason, userId);
        rememberResult(jobId, "completed", data);
        return { jobId };
      },
      async getStatus(jobId) {
        const remembered = readRememberedResult(jobId);
        if (!remembered) return { status: "unknown" };
        if (remembered.status === "completed") return { status: "completed", data: remembered.payload };
        return { status: "failed", error: remembered.payload?.message ?? "Job failed" };
      },
      async close() {
        return Promise.resolve();
      }
    };
  }

  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue(QUEUE_NAME, { connection });
  const queueEvents = new QueueEvents(QUEUE_NAME, { connection });
  const gcTimer = startResultGarbageCollector();

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const result = await processAnalysis(job.data.url, job.data.reason ?? "queued", job.data.userId ?? null);
      rememberResult(job.id, "completed", result);
      return result;
    },
    {
      connection,
      concurrency: Math.max(1, Number(process.env.QUEUE_CONCURRENCY ?? 2))
    }
  );

  worker.on("failed", (job, err) => {
    if (job?.id) rememberResult(job.id, "failed", { message: err.message });
  });

  return {
    enabled: true,
    async enqueue(url, reason = "manual", userId = null) {
      try {
        const job = await queue.add(
          "analyze",
          { url, reason, userId },
          { removeOnComplete: { age: 3600 }, removeOnFail: { age: 7200 } }
        );
        return { jobId: job.id };
      } catch (err) {
        // Redis down or queue error: fallback to inline and keep API usable.
        const jobId = `inline-${Date.now()}`;
        const data = await processAnalysis(url, reason, userId);
        rememberResult(jobId, "completed", data);
        return { jobId };
      }
    },
    async enqueueAndWait(url, reason = "manual", userId = null) {
      try {
        const job = await queue.add(
          "analyze",
          { url, reason, userId },
          { removeOnComplete: { age: 3600 }, removeOnFail: { age: 7200 } }
        );
        const timeoutMs = Math.max(
          20000,
          Number(process.env.ANALYZE_JOB_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS)
        );
        const result = await job.waitUntilFinished(queueEvents, timeoutMs);
        return { jobId: job.id, data: result };
      } catch (err) {
        const jobId = `inline-${Date.now()}`;
        const data = await processAnalysis(url, reason, userId);
        rememberResult(jobId, "completed", data);
        return { jobId, data };
      }
    },
    async getStatus(jobId) {
      const remembered = readRememberedResult(jobId);
      if (remembered) {
        if (remembered.status === "completed") return { status: "completed", data: remembered.payload };
        return { status: "failed", error: remembered.payload?.message ?? "Job failed" };
      }

      const job = await queue.getJob(jobId);
      if (!job) return { status: "unknown" };
      const state = await job.getState();
      if (state === "completed") return { status: "completed", data: await job.returnvalue };
      if (state === "failed") return { status: "failed", error: job.failedReason ?? "Job failed" };
      return { status: state };
    },
    async close() {
      clearInterval(gcTimer);
      await Promise.all([worker.close(), queueEvents.close(), queue.close(), connection.quit()]);
    }
  };
}
