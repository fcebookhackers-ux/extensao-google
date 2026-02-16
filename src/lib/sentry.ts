import * as Sentry from "@sentry/react";

/**
 * Inicializa o Sentry somente quando houver DSN configurado.
 * DSN deve ser definido como variável de ambiente Vite: VITE_SENTRY_DSN.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  // Evita inicialização dupla em HMR/dev
  if ((window as any).__ZAPF_SENTRY_INIT__) return;
  (window as any).__ZAPF_SENTRY_INIT__ = true;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    enabled: import.meta.env.PROD,
    // Mantém simples: o projeto já tem telemetry/web-vitals.
    tracesSampleRate: 0,
  });
}
