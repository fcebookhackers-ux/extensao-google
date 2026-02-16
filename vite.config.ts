import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Gere stats.html rodando: `vite build --mode analyze`
    mode === "analyze" &&
      visualizer({
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Evita múltiplas cópias de React em bundles (causa "Invalid hook call")
    // Inclui também os runtimes do JSX para evitar cenários onde um chunk (ex.: Radix)
    // resolve para uma instância diferente e quebra APIs como forwardRef.
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // IMPORTANTE: Mantemos dependências externas em um chunk de vendor único.
          // Em certos hosts/CDNs, chunks separados podem falhar ao carregar (404/cache/proxy),
          // fazendo com que libs (ex.: Radix) recebam um React indefinido e explodam em
          // `Cannot read properties of undefined (reading 'forwardRef')`.
          if (id.includes("node_modules")) return "vendor";

          // Feature chunks (Dashboard)
          if (id.includes("/src/pages/dashboard/") || id.includes("\\src\\pages\\dashboard\\")) {
            if (id.includes("/automacoes/") || id.includes("\\automacoes\\") || id.includes("/Automacoes") || id.includes("\\Automacoes")) {
              return "feature-automacoes";
            }
            if (id.includes("/Webhook") || id.includes("webhook") || id.includes("/WebhookJobs") || id.includes("\\WebhookJobs")) {
              return "feature-webhooks";
            }
            if (id.includes("/Analytics") || id.includes("\\Analytics")) {
              return "feature-analytics";
            }
            return "feature-dashboard";
          }

          // Feature chunks (Components)
          if (id.includes("/src/components/analytics/") || id.includes("\\src\\components\\analytics\\")) {
            return "feature-analytics";
          }
          if (id.includes("/src/components/webhooks/") || id.includes("\\src\\components\\webhooks\\")) {
            return "feature-webhooks";
          }
          if (id.includes("/src/components/automation/") || id.includes("\\src\\components\\automation\\")) {
            return "feature-automacoes";
          }

          return undefined;
        },
      },
    },
    cssCodeSplit: true,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
    ],
  },
}));
