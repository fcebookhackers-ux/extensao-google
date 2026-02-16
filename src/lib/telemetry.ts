import { BatchSpanProcessor, ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { getWebAutoInstrumentations } from "@opentelemetry/auto-instrumentations-web";

const SERVICE_NAME = "zapfllow-frontend";

export function getCurrentWorkspaceId(): string | null {
  try {
    return typeof localStorage !== "undefined"
      ? localStorage.getItem("selected-workspace-id")
      : null;
  } catch {
    return null;
  }
}

let initialized = false;

/**
 * Inicializa OpenTelemetry no browser.
 * Modo atual: exportação local (ConsoleSpanExporter).
 */
export function initTelemetry() {
  if (initialized) return;
  initialized = true;

  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: import.meta.env.MODE,
    }),
    // v2: span processors são configurados via TracerConfig
    spanProcessors: [new BatchSpanProcessor(new ConsoleSpanExporter())],
  });

  provider.register();

  // Auto-instrumentação (fetch/XHR/history/etc.)
  registerInstrumentations({
    instrumentations: [
      getWebAutoInstrumentations({
        "@opentelemetry/instrumentation-fetch": {
          // Importante: permitir trace headers para Supabase + domínios do projeto.
          propagateTraceHeaderCorsUrls: [/supabase\.co/i, /lovable\.(app|project)/i],
          applyCustomAttributesOnSpan(span) {
            const ws = getCurrentWorkspaceId();
            if (ws) span.setAttribute("app.workspace_id", ws);
          },
        },
        "@opentelemetry/instrumentation-xml-http-request": { enabled: true },
      }),
    ],
  });
}
