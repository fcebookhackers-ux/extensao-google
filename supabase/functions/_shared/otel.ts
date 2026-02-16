import { context, trace } from "https://esm.sh/@opentelemetry/api@1.9.0";
import {
  BasicTracerProvider,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from "https://esm.sh/@opentelemetry/sdk-trace-base@2.1.0";

let booted = false;

function ensureProvider() {
  if (booted) return;
  booted = true;

  // Exportação local: spans vão para os logs da Edge Function (Supabase Logs).
  const provider = new BasicTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())],
  });
  // sdk-trace-base v2: registra via API
  trace.setGlobalTracerProvider(provider as any);
}

function getTraceparent(req: Request): string | null {
  return req.headers.get("traceparent") ?? null;
}

export async function withOtel<T>(
  req: Request,
  spanName: string,
  fn: (span: any) => Promise<T>,
): Promise<T> {
  ensureProvider();
  const tracer = trace.getTracer("zapfllow-edge");

  // Sem propagator completo (modo local): registramos traceparent recebido para correlacionar.
  const tp = getTraceparent(req);
  const span = tracer.startSpan(spanName);
  try {
    if (tp) span.setAttribute("http.traceparent", tp);
    span.setAttribute("http.method", req.method);
    return await context.with(trace.setSpan(context.active(), span), () => fn(span as any));
  } catch (e) {
    span.recordException(e as any);
    throw e;
  } finally {
    span.end();
  }
}
