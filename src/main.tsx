import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { initTelemetry } from "@/lib/telemetry";
import { reportWebVitals } from "@/lib/performance";
import { initSentry } from "@/lib/sentry";

// Observabilidade (somente em produção)
if (import.meta.env.PROD) {
  initSentry();
  initTelemetry();
  reportWebVitals();
}

// Service Worker (somente em produção)
// IMPORTANTE: no preview do Lovable, o domínio pode mudar e/ou ficar preso em caches antigos.
// Para evitar “tela em branco” por bundle desatualizado servido via SW, desabilitamos o SW
// automaticamente em hosts de preview.
const isLovablePreviewHost = (() => {
  try {
    const h = window.location.hostname;
    return (
      h.endsWith(".lovable.app") ||
      h.endsWith(".lovableproject.com") ||
      h === "lovable.app" ||
      h === "lovableproject.com"
    );
  } catch {
    return false;
  }
})();

if (import.meta.env.PROD && !isLovablePreviewHost && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // Registrar service worker (cache de assets estáticos, sem cachear Supabase)
    // OBS: usar um SW inexistente pode causar comportamento inconsistente por cache antigo.
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("SW registration failed:", err);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
