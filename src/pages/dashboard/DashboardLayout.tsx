import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { OnboardingCompleteBanner } from "@/components/onboarding/OnboardingCompleteBanner";
import { useAuth } from "@/providers/AuthProvider";
import { PageFadeIn } from "@/components/motion/PageFadeIn";
import { Outlet } from "react-router-dom";
import { GuidedTour } from "@/components/help/GuidedTour";
import { HelpCenter } from "@/components/help/HelpCenter";
import { useTour } from "@/hooks/useTour";
import { ONBOARDING_TOUR } from "@/config/tours";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CommandPalette } from "@/components/CommandPalette";
import { useUserWorkspaces } from "@/hooks/useUserWorkspaces";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";

export function DashboardLayout() {
  const { user } = useAuth();
  const { run, startTour } = useTour("onboarding", false);
  const workspacesQuery = useUserWorkspaces();
  const { workspaceId, setCurrentWorkspaceId } = useCurrentWorkspace();

  // Scheduler (sem service role): checa alertas do usuário autenticado a cada 5 min
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    let running = false;

    const tick = async () => {
      if (cancelled || running) return;
      running = true;
      try {
        await supabase.functions.invoke("check-alerts", { body: {} });
      } catch (err) {
        // silencioso: não queremos spam de toasts/logs para chamadas em background
        console.warn("check-alerts background error", err);
      } finally {
        running = false;
      }
    };

    // roda uma vez ao entrar
    tick();
    const id = window.setInterval(tick, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const createdAt = (user as any).created_at;
    if (!createdAt) return;
    const accountAge = Date.now() - new Date(createdAt).getTime();
    const isNewUser = accountAge < 24 * 60 * 60 * 1000;
    if (isNewUser) {
      startTour();
    }
  }, [user, startTour]);

  useEffect(() => {
    if (!user || workspaceId) return;
    if (workspacesQuery.isLoading || workspacesQuery.isError) return;
    const first = workspacesQuery.data?.[0]?.id ?? null;
    if (first) {
      setCurrentWorkspaceId(first);
    }
  }, [user, workspaceId, workspacesQuery.isLoading, workspacesQuery.isError, workspacesQuery.data, setCurrentWorkspaceId]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <CommandPalette />
        <AppSidebar />
        <SidebarInset>
          <Topbar />
          <div className="px-4 pt-3">
            <p className="text-xs text-muted-foreground">
              Pressione <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘</kbd>+
              <kbd className="ml-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">K</kbd> (ou
              Ctrl+K) para abrir a busca rápida.
            </p>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              <OnboardingCompleteBanner />
              <OnboardingChecklist />
            </div>
            <PageFadeIn>
              <Outlet />
            </PageFadeIn>
          </div>
        </SidebarInset>

        {/* Modal de onboarding no primeiro login/perfil incompleto */}
        {user && <OnboardingWizard user={user} />}

        {/* Tour guiado de onboarding (não bloqueante) */}
        <GuidedTour tourId="onboarding" steps={ONBOARDING_TOUR} run={run} />

        {/* Botão flutuante da central de ajuda */}
        <HelpCenter />
      </div>
    </SidebarProvider>
  );
}
