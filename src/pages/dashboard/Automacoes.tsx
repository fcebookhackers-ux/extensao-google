import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DashboardPageShell } from "@/pages/dashboard/_DashboardPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { EmptyState } from "@/components/common/EmptyState";
import { PermissionGuard } from "@/components/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { AUTOMATIONS_TOUR } from "@/config/tours";
import { AlertCircle, Workflow } from "lucide-react";

type AutomationListItem = {
  id: string;
  user_id: string;
  name: string;
  status: "draft" | "active" | "paused";
  updated_at: string;
  created_at: string;
};

function getSupabaseErrorMessage(err: unknown) {
  // supabase-js PostgrestError shape
  const anyErr = err as any;
  return (
    anyErr?.message ||
    anyErr?.error_description ||
    anyErr?.details ||
    anyErr?.hint ||
    "Operação não permitida."
  );
}

export default function DashboardAutomacoes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { completeStep } = useOnboarding();
  const canCreate = usePermission("automations.create");
  const canDelete = usePermission("automations.delete");

  const automationsQuery = useQuery({
    queryKey: ["automations"],
    enabled: !!user,
    queryFn: async (): Promise<AutomationListItem[]> => {
      const { data, error } = await supabase
        .from("automations")
        .select("id,user_id,name,status,updated_at,created_at")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as AutomationListItem[];
    },
    staleTime: 30_000,
  });

  const createAutomation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");
      const payload = {
        name: `Nova automação ${new Date().toLocaleString()}`,
        user_id: user.id,
        status: "draft" as const,
        trigger: {},
        global_config: {},
        doc: {},
        tags_library: [],
      };

      const { data, error } = await supabase.from("automations").insert(payload).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast({
        title: "Automação criada",
        description: "Rascunho criado com sucesso.",
      });
      completeStep("automation_created", { id: data?.id ?? null });
      if (data?.id) navigate(`/dashboard/automacoes/editor/${data.id}`);
    },
    onError: (err) => {
      toast({
        title: "Bloqueado por permissão/RLS",
        description: getSupabaseErrorMessage(err),
        variant: "destructive",
      });
    },
  });

  const renameAutomation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("automations")
        .update({ name: `Renomeado ${new Date().toLocaleTimeString()}` })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast({ title: "Atualização enviada", description: "Se você não tiver permissão, o RLS bloqueará." });
    },
    onError: (err) => {
      toast({
        title: "UPDATE bloqueado por RLS",
        description: getSupabaseErrorMessage(err),
        variant: "destructive",
      });
    },
  });

  const deleteAutomation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast({ title: "Exclusão enviada", description: "Se você não tiver permissão, o RLS bloqueará." });
    },
    onError: (err) => {
      toast({
        title: "DELETE bloqueado por RLS",
        description: getSupabaseErrorMessage(err),
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      <OnboardingTour tourId="automations" steps={AUTOMATIONS_TOUR} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <DashboardPageShell title="ZapFllow" description="Fluxos e regras" />

        <div className="flex items-center gap-2">
          <PermissionGuard
            permission="automations.create"
            fallback={
              <Button variant="outline" disabled>
                Sem permissão para criar
              </Button>
            }
            showSkeleton={false}
          >
            <Button
              onClick={() => createAutomation.mutate()}
              disabled={createAutomation.isPending}
              data-tour="create-automation-btn"
            >
              {createAutomation.isPending ? "Criando…" : "Nova automação"}
            </Button>
          </PermissionGuard>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suas automações</CardTitle>
        </CardHeader>
        <CardContent>
          {automationsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : automationsQuery.isError ? (
            <EmptyState
              icon={<AlertCircle />}
              title="Não foi possível carregar"
              description={getSupabaseErrorMessage(automationsQuery.error)}
              action={{
                label: "Tentar novamente",
                onClick: () => void automationsQuery.refetch(),
                variant: "outline",
              }}
            />
          ) : (automationsQuery.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Workflow />}
              title="Nenhuma automação ainda"
              description="Crie sua primeira automação para começar a montar seus fluxos."
              action={
                canCreate.isLoading
                  ? undefined
                  : canCreate.data
                    ? {
                        label: "Criar automação",
                        onClick: () => createAutomation.mutate(),
                      }
                    : {
                        label: "Sem permissão para criar",
                        variant: "outline",
                        onClick: () =>
                          toast({
                            title: "Sem permissão",
                            description: "Sua conta não tem a permissão automations.create.",
                            variant: "destructive",
                          }),
                      }
              }
            />
          ) : (
            <div className="space-y-2">
              {automationsQuery.data!.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                  <button
                    type="button"
                    className="min-w-0 text-left"
                    onClick={() => navigate(`/dashboard/automacoes/editor/${a.id}`)}
                    title="Abrir editor"
                  >
                    <div className="truncate font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Status: {a.status} • Atualizado: {new Date(a.updated_at).toLocaleString()}
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    <PermissionGuard
                      permission="automations.edit"
                      fallback={
                        <Button variant="outline" size="sm" disabled>
                          Sem permissão p/ editar
                        </Button>
                      }
                      showSkeleton={false}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => renameAutomation.mutate(a.id)}
                        disabled={renameAutomation.isPending}
                      >
                        Testar UPDATE
                      </Button>
                    </PermissionGuard>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteAutomation.mutate(a.id)}
                      disabled={deleteAutomation.isPending || (!canDelete.data && a.user_id !== user?.id)}
                    >
                      {(!canDelete.data && a.user_id !== user?.id) ? "Sem permissão p/ excluir" : "Excluir"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
