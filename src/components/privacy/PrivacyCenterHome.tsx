import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, Shield, Trash2, SlidersHorizontal, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAccountDeletion, useDataExport } from "@/hooks/usePrivacy";
import { exportStatusLabel, deletionStatusLabel } from "@/components/privacy/privacy-status";

export function PrivacyCenterHome() {
  const { exports } = useDataExport({ refetchIntervalMs: 30_000 });
  const { pendingDeletion, deletions } = useAccountDeletion({ refetchIntervalMs: 30_000 });

  const latestExport = exports[0];
  const latestDeletion = deletions[0];

  const latestPolicyQuery = useQuery({
    queryKey: ["policy-versions", "privacy_policy", "latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policy_versions")
        .select("*")
        .eq("policy_type", "privacy_policy")
        .order("effective_from", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Central de Privacidade (LGPD)</h1>
        <p className="text-sm text-muted-foreground">Exportação, exclusão e preferências de consentimento.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4" /> Exportar meus dados
            </CardTitle>
            <CardDescription>Baixe uma cópia dos seus dados.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/dashboard/privacidade/exportar">Solicitar exportação</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trash2 className="h-4 w-4" /> Solicitar exclusão
            </CardTitle>
            <CardDescription>Exclusão agendada com período de graça.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant={pendingDeletion ? "secondary" : "destructive"} className="w-full">
              <Link to="/dashboard/privacidade/exclusao">{pendingDeletion ? "Ver exclusão agendada" : "Solicitar exclusão"}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SlidersHorizontal className="h-4 w-4" /> Gerenciar consentimentos
            </CardTitle>
            <CardDescription>Atualize suas preferências.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/dashboard/privacidade/consentimentos">Abrir consentimentos</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Solicitações ativas</CardTitle>
            <CardDescription>Status das últimas solicitações (auto-refresh a cada 30s).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Exportação</p>
                <p className="text-xs text-muted-foreground">
                  {latestExport
                    ? formatDistanceToNow(new Date(latestExport.requested_at), { addSuffix: true, locale: ptBR })
                    : "Nenhuma solicitação"}
                </p>
              </div>
              {latestExport ? <Badge variant="secondary">{exportStatusLabel(latestExport.status)}</Badge> : <Badge variant="outline">—</Badge>}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Exclusão</p>
                <p className="text-xs text-muted-foreground">
                  {latestDeletion
                    ? formatDistanceToNow(new Date(latestDeletion.requested_at), { addSuffix: true, locale: ptBR })
                    : "Nenhuma solicitação"}
                </p>
              </div>
              {latestDeletion ? (
                <Badge variant={pendingDeletion ? "destructive" : "secondary"}>{deletionStatusLabel(latestDeletion.status)}</Badge>
              ) : (
                <Badge variant="outline">—</Badge>
              )}
            </div>

            <Button asChild variant="outline" className="w-full">
              <Link to="/dashboard/privacidade/historico">Ver histórico completo</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Política de Privacidade
            </CardTitle>
            <CardDescription>Última atualização registrada no sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestPolicyQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : latestPolicyQuery.data ? (
              <div className="rounded-md border p-3">
                <p className="text-sm font-medium">Versão {latestPolicyQuery.data.version}</p>
                <p className="text-xs text-muted-foreground">Vigente desde {new Date(latestPolicyQuery.data.effective_from).toLocaleDateString("pt-BR")}</p>
              </div>
            ) : (
              <div className="rounded-md border p-3">
                <p className="text-sm text-muted-foreground">Nenhuma versão registrada em policy_versions.</p>
              </div>
            )}

            <Button asChild variant="link" className="h-auto p-0">
              <a href="/politica-de-privacidade" target="_blank" rel="noreferrer">
                Abrir Política de Privacidade →
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
