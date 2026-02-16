import * as React from "react";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { persister, queryClient } from "@/lib/query-persist";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "@/providers/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SpinnerMessage } from "@/components/common/loading/SpinnerMessage";
import Login from "@/pages/Login";
import Cadastro from "@/pages/Cadastro";
import RecuperarSenha from "@/pages/RecuperarSenha";
import RedefinirSenha from "@/pages/RedefinirSenha";
import { DashboardLayout } from "@/pages/dashboard/DashboardLayout";
import { Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Sobre from "@/pages/Sobre";
import TermosDeUso from "@/pages/TermosDeUso";
import PoliticaDePrivacidade from "@/pages/PoliticaDePrivacidade";
import PoliticaDeCookies from "@/pages/PoliticaDeCookies";
import Lgpd from "@/pages/Lgpd";
import Contato from "@/pages/Contato";
import Seguranca from "@/pages/Seguranca";
import PrivacyCenter from "@/pages/PrivacyCenter";
import { CookieConsentGate } from "@/components/cookies/CookieConsentGate";
import { startCleanupScheduler } from "@/lib/cache-cleanup";
import { UpdateNotification } from "@/components/UpdateNotification";
import { ErrorState } from "@/components/empty-states/ErrorState";

const DashboardInicio = React.lazy(() => import("@/pages/dashboard/Inicio"));
const DashboardConversas = React.lazy(() => import("@/pages/dashboard/Conversas"));
const DashboardAutomacoes = React.lazy(() => import("@/pages/dashboard/Automacoes"));
const AutomationEditor = React.lazy(() => import("@/pages/dashboard/automacoes/Editor"));
const DashboardTemplates = React.lazy(() => import("@/pages/dashboard/Templates"));
const DashboardContatos = React.lazy(() => import("@/pages/dashboard/Contatos"));
const DashboardRelatorios = React.lazy(() => import("@/pages/dashboard/Relatorios"));
const DashboardAnalytics = React.lazy(() => import("@/pages/dashboard/Analytics"));
const ConectarWhatsapp = React.lazy(() => import("@/pages/dashboard/ConectarWhatsapp"));
const DashboardPlanos = React.lazy(() => import("@/pages/dashboard/Planos"));
const DashboardCampanhas = React.lazy(() => import("@/pages/dashboard/Campanhas"));
const DashboardConfiguracoes = React.lazy(() => import("@/pages/dashboard/Configuracoes"));
const DashboardAdmin = React.lazy(() => import("@/pages/dashboard/Admin"));
const DashboardNotificacoes = React.lazy(() => import("@/pages/dashboard/Notificacoes"));
const DashboardPrivacidade = React.lazy(() => import("@/pages/dashboard/Privacidade"));
const DashboardSystemHealth = React.lazy(() => import("@/pages/dashboard/SystemHealth"));
const DashboardAlertas = React.lazy(() => import("@/pages/dashboard/Alertas"));
const AutomationSimulator = React.lazy(() => import("@/pages/dashboard/automacoes/Simulator"));
const AutomacoesVersoes = React.lazy(() => import("@/pages/dashboard/automacoes/Versoes"));
const DashboardAtividades = React.lazy(() => import("@/pages/dashboard/Atividades"));
const DashboardAudit = React.lazy(() => import("@/pages/dashboard/Audit"));
const DashboardWebhookJobs = React.lazy(() => import("@/pages/dashboard/WebhookJobs"));
const DashboardSLIs = React.lazy(() => import("@/pages/dashboard/SLIs"));
const DashboardWhatsAppConnect = React.lazy(() => import("@/pages/dashboard/WhatsAppConnect"));

const App = () => {
  const [fatalError, setFatalError] = React.useState<string | null>(null);

  useEffect(() => {
    startCleanupScheduler();
  }, []);

  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("[global] Unhandled promise rejection:", event.reason);
      // Impede que o navegador trate como erro fatal (evita “tela em branco” em alguns ambientes)
      event.preventDefault?.();
      setFatalError((prev) => prev ?? "Ocorreu um erro inesperado ao carregar a aplicação.");
    };

    const onError = (event: ErrorEvent) => {
      console.error("[global] Window error:", event.error ?? event.message);
      setFatalError((prev) => prev ?? "Ocorreu um erro inesperado ao carregar a aplicação.");
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  if (fatalError) {
    return (
      <div className="min-h-screen bg-background">
        <ErrorState
          title="Não foi possível carregar"
          description={fatalError}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <CookieConsentGate />
              <UpdateNotification />
              <React.Suspense fallback={<SpinnerMessage message="Carregando..." />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/sobre" element={<Sobre />} />
                  <Route path="/termos-de-uso" element={<TermosDeUso />} />
                  <Route path="/politica-de-privacidade" element={<PoliticaDePrivacidade />} />
                  <Route path="/politica-de-cookies" element={<PoliticaDeCookies />} />
                  <Route path="/lgpd" element={<Lgpd />} />
                  <Route
                    path="/privacy-center"
                    element={
                      <ProtectedRoute>
                        <PrivacyCenter />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/contato" element={<Contato />} />
                  <Route path="/seguranca" element={<Seguranca />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/cadastro" element={<Cadastro />} />
                  <Route path="/recuperar-senha" element={<RecuperarSenha />} />
                  <Route path="/redefinir-senha" element={<RedefinirSenha />} />
                  <Route path="/redefinir-senha/:token" element={<RedefinirSenha />} />

                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Navigate to="/dashboard/inicio" replace />} />
                    <Route path="inicio" element={<DashboardInicio />} />
                    <Route path="conversas" element={<DashboardConversas />} />
                    <Route path="automacoes" element={<DashboardAutomacoes />} />
                    <Route path="automacoes/editor/:id" element={<AutomationEditor />} />
                    <Route path="automacoes/:id/versoes" element={<AutomacoesVersoes />} />
                    <Route path="automacoes/:id/simulator" element={<AutomationSimulator />} />
                    <Route path="automations/:id/simulator" element={<AutomationSimulator />} />
                    <Route path="templates" element={<DashboardTemplates />} />
                    <Route path="contatos" element={<DashboardContatos />} />
                    <Route path="relatorios" element={<DashboardRelatorios />} />
                    <Route path="analytics" element={<DashboardAnalytics />} />
                    <Route path="system-health" element={<DashboardSystemHealth />} />
                    <Route path="sli" element={<DashboardSLIs />} />
                    <Route path="alertas" element={<DashboardAlertas />} />
                    <Route path="webhook-jobs" element={<DashboardWebhookJobs />} />
                    <Route path="whatsapp" element={<DashboardWhatsAppConnect />} />
                    <Route path="conectar-whatsapp" element={<DashboardWhatsAppConnect />} />
                    <Route path="planos" element={<DashboardPlanos />} />
                    <Route path="campanhas" element={<DashboardCampanhas />} />
                    <Route path="configuracoes" element={<DashboardConfiguracoes />} />
                    <Route path="privacidade/*" element={<DashboardPrivacidade />} />
                    <Route path="notificacoes" element={<DashboardNotificacoes />} />
                    <Route path="atividades" element={<DashboardAtividades />} />
                    <Route path="audit" element={<DashboardAudit />} />
                    <Route path="admin" element={<DashboardAdmin />} />
                  </Route>

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </React.Suspense>
            </BrowserRouter>
          </ErrorBoundary>
        </AuthProvider>
      </TooltipProvider>
    </PersistQueryClientProvider>
  );
};

export default App;
