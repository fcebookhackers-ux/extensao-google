import {
  onCLS,
  onFCP,
  onINP,
  onLCP,
  onTTFB,
  type Metric,
} from "web-vitals";

type VitalsName = "CLS" | "FCP" | "INP" | "LCP" | "TTFB";

function sendToTelemetry(name: VitalsName, metric: Metric) {
  // Mantemos simples e compatível com o plano free:
  // - Se você tiver um collector/OTel no futuro, podemos converter isso em spans.
  // - Por enquanto, fica como evento de analytics best-effort.
  try {
    (window as any).gtag?.("event", name, {
      value: Math.round(metric.value),
      metric_id: metric.id,
      metric_delta: metric.delta,
    });
  } catch {
    // no-op
  }
}

export function reportWebVitals() {
  onCLS((m) => sendToTelemetry("CLS", m));
  onFCP((m) => sendToTelemetry("FCP", m));
  onINP((m) => sendToTelemetry("INP", m));
  onLCP((m) => sendToTelemetry("LCP", m));
  onTTFB((m) => sendToTelemetry("TTFB", m));
}
