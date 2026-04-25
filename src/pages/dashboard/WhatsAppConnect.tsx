import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Smartphone,
  Loader2,
  CheckCircle2,
  Wifi,
  LogOut,
  MessageSquare,
  Zap,
  Info,
  RefreshCw,
  AlertCircle,
  Bug,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

import { useWhatsAppInstance } from "@/hooks/useWhatsAppInstance";
import { formatPhoneNumber, formatDate, formatRelativeTime } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

// Modelo: instância global → sempre usar o workspace principal
const PRIMARY_WORKSPACE_ID = "e3946d71-98ec-4c08-9adb-9b6ed0e28e2d";

function getInvokeErrorDetails(err: unknown) {
  const anyErr = err as any;
  const status = anyErr?.context?.status ?? anyErr?.status ?? null;
  const body = anyErr?.context?.body ?? null;
  const bodyMessage = typeof body === "string" ? body : body?.message ?? body?.error ?? null;
  const message = bodyMessage ?? anyErr?.message ?? "Erro desconhecido";
  return { status, body, message };
}

export default function WhatsAppConnect() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const workspaceId = PRIMARY_WORKSPACE_ID;
  const { instance, isLoading, error, createInstance, disconnectInstance, resetInstance, refetch } =
    useWhatsAppInstance(workspaceId);

  const { data: canManage = false, isLoading: permLoading } = useQuery({
    queryKey: ["workspace-permission", workspaceId, user?.id ?? null, "whatsapp.manage"],
    enabled: !!user,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc("workspace_has_permission", {
        p_workspace_id: workspaceId,
        p_permission: "whatsapp.manage",
        p_user_id: user!.id,
      });
      if (error) {
        console.error("workspace_has_permission error:", error);
        return false;
      }
      return Boolean(data);
    },
    staleTime: 60_000,
    retry: 1,
  });

  const statusLabel = useMemo(() => {
    if (!instance) return null;
    switch (instance.status) {
      case "connected":
        return { text: "Online", variant: "default" as const };
      case "qr_ready":
      case "connecting":
        return { text: "Aguardando", variant: "secondary" as const };
      case "error":
        return { text: "Erro", variant: "destructive" as const };
      default:
        return { text: instance.status, variant: "outline" as const };
    }
  }, [instance]);

  // Função para testar conexão Evolution
  const testEvolutionConnection = async () => {
    setIsTestingConnection(true);
    setDiagnosticResult(null);

    try {
      console.log("🧪 Testando conexão Evolution API...");

      const { data, error } = await apiFetch("/api/whatsapp/evolution/test");

      console.log("📊 Resultado do teste:", { data, error });

      if (error) {
        const details = getInvokeErrorDetails(error);
        const isFetchError = String(error?.message ?? "").includes("Failed to send a request");

        let responseText: string | null = null;
        let responseBody: any = null;
        const response = (error as any)?.context;

        if (response instanceof Response) {
          try {
            responseText = await response.clone().text();
            responseBody = responseText ? JSON.parse(responseText) : null;
          } catch {
            responseBody = responseText;
          }
        }

        const messageFromBody =
          responseBody && typeof responseBody === "object" ? responseBody.message ?? responseBody.error : null;

        setDiagnosticResult({
          success: false,
          error: messageFromBody ?? details.message,
          details: {
            ...details,
            responseStatus: response?.status ?? details.status ?? null,
            responseText,
            responseBody,
          },
          message: messageFromBody ?? details.message,
          possibleCauses: responseBody?.possibleCauses ?? (isFetchError
            ? [
                "Edge Function não foi deployada no projeto Supabase",
                "Projeto Supabase pausado ou indisponível",
                "Bloqueio de rede/proxy/firewall",
              ]
            : undefined),
          instructions: responseBody?.instructions ?? (isFetchError
            ? [
                "Verifique se a função `test-evolution-connection` está publicada no Supabase",
                "Confirme se o projeto está ativo (não pausado)",
                "Teste o endpoint no navegador: https://<project>.supabase.co/functions/v1/test-evolution-connection",
              ]
            : undefined),
        });
      } else {
        setDiagnosticResult(data);
      }
    } catch (err: any) {
      console.error("💥 Erro ao testar:", err);
      setDiagnosticResult({
        success: false,
        error: err?.message ?? "Erro desconhecido",
        message: err?.message ?? "Erro desconhecido",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Função para garantir setup do usuário
  const ensureUserSetup = async () => {
    try {
      console.log("🔧 Garantindo setup do usuário...");

      const { data, error } = await supabase.functions.invoke("ensure-user-setup");

      console.log("📊 Resultado do setup:", { data, error });

      if (error) {
        const details = getInvokeErrorDetails(error);
        let responseText: string | null = null;
        let responseBody: any = null;
        const response = (error as any)?.context;

        if (response instanceof Response) {
          try {
            responseText = await response.clone().text();
            responseBody = responseText ? JSON.parse(responseText) : null;
          } catch {
            responseBody = responseText;
          }
        }

        const messageFromBody =
          responseBody && typeof responseBody === "object" ? responseBody.message ?? responseBody.error : null;

        const message = messageFromBody ?? details.message;
        console.error("❌ [SETUP] Edge Function error:", {
          details,
          responseText,
          responseBody,
        });

        alert(`Erro no setup: ${message}`);
      } else {
        alert("✅ Setup completo! Você agora pode conectar o WhatsApp.");
        window.location.reload();
      }
    } catch (err: any) {
      console.error("💥 Erro no setup:", err);
      alert(`Erro: ${err?.message ?? "Erro desconhecido"}`);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4">
        <Card>
          <CardContent className="flex items-center justify-center gap-3 py-16">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm text-muted-foreground">Carregando...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4">
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar instância</AlertTitle>
          <AlertDescription>{error instanceof Error ? error.message : "Erro desconhecido"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Não tem instância - mostrar tela inicial
  if (!instance) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 p-4">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Conectar WhatsApp Business
                </CardTitle>
                <CardDescription>
                  Conecte sua conta do WhatsApp Business para começar a automatizar conversas e gerenciar seus clientes
                </CardDescription>
              </div>

              <div className="flex flex-col items-end gap-2">
                <Badge variant="outline">Workspace: {workspaceId.slice(0, 8)}</Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 lg:grid-cols-2">
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Como funciona?
                </CardTitle>
                <CardDescription>Conecte em poucos passos.</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs">1</span>
                    Clique no botão “Conectar WhatsApp” abaixo
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs">2</span>
                    Um QR Code será gerado na tela
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs">3</span>
                    Abra o WhatsApp no seu celular e escaneie o código
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs">4</span>
                    Pronto! Sua conta estará conectada e pronta para uso
                  </li>
                </ol>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {!canManage ? (
                <Alert>
                  <AlertTitle>Conexão administrada</AlertTitle>
                  <AlertDescription>
                    Este WhatsApp é <strong>global</strong> e é conectado apenas pelo administrador.
                    {permLoading ? (
                      <span className="ml-1">Verificando permissão...</span>
                    ) : (
                      <span className="ml-1">Peça ao admin para conectar e depois volte aqui.</span>
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}

              <Alert>
                <AlertTitle className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Requisitos importantes
                </AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    <li>Tenha o WhatsApp instalado no seu celular</li>
                    <li>Use o número que deseja conectar ao ZapFllow</li>
                    <li>Mantenha o celular por perto durante o processo</li>
                    <li>Certifique-se de ter conexão com a internet</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Alert>
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>
                  Este número ficará conectado ao ZapFllow. Você poderá continuar usando o WhatsApp normalmente no seu
                  celular.
                </AlertDescription>
              </Alert>

              {/* Painel de Diagnóstico - Desenvolvimento */}
              {import.meta.env.DEV ? (
                <Card className="shadow-none">
                  <CardHeader className="space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Bug className="h-4 w-4" />
                          🧪 Painel de Diagnóstico
                        </CardTitle>
                        <CardDescription>Use estes botões para testar a conexão antes de conectar</CardDescription>
                      </div>
                      <Button
                        onClick={() => setShowDebugPanel((v) => !v)}
                        variant="outline"
                        size="icon"
                        aria-label={showDebugPanel ? "Ocultar debug" : "Mostrar debug"}
                      >
                        {showDebugPanel ? "👁️" : "👁️‍🗨️"}
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        onClick={testEvolutionConnection}
                        disabled={isTestingConnection}
                        className="w-full"
                        variant="outline"
                      >
                        {isTestingConnection ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Testando...
                          </>
                        ) : (
                          <>🔍 Testar Conexão Evolution</>
                        )}
                      </Button>

                      <Button onClick={ensureUserSetup} className="w-full" variant="outline">
                        🔧 Garantir Setup do Usuário
                      </Button>
                    </div>

                    {/* Resultado do Teste */}
                    {diagnosticResult ? (
                      <Alert variant={diagnosticResult.success ? "default" : "destructive"}>
                        <AlertTitle className="flex items-center gap-2">
                          {diagnosticResult.success ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          {diagnosticResult.success ? "✅ Sucesso!" : "❌ Falha"}
                        </AlertTitle>
                        <AlertDescription>
                          <div className="space-y-2">
                            {diagnosticResult.message ? <p className="text-sm">{diagnosticResult.message}</p> : null}

                            {diagnosticResult.success && diagnosticResult.summary ? (
                              <div className="space-y-1 text-sm">
                                <p>
                                  <span className="font-medium">URL:</span> {diagnosticResult.summary.url}
                                </p>
                                <p>
                                  <span className="font-medium">Status:</span> {diagnosticResult.summary.status}
                                </p>
                                <p>
                                  <span className="font-medium">Tempo:</span> {diagnosticResult.summary.responseTime}
                                </p>
                                <p>
                                  <span className="font-medium">Instâncias:</span> {diagnosticResult.summary.instancesFound}
                                </p>
                              </div>
                            ) : null}

                            {!diagnosticResult.success && diagnosticResult.possibleCauses ? (
                              <div className="space-y-1 text-sm">
                                <p className="font-medium">Possíveis causas:</p>
                                <ul className="list-disc space-y-0.5 pl-5">
                                  {diagnosticResult.possibleCauses.map((cause: string, i: number) => (
                                    <li key={i}>{cause}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}

                            {diagnosticResult.instructions ? (
                              <div className="space-y-1 text-sm">
                                <p className="font-medium">Como corrigir:</p>
                                <ul className="list-disc space-y-0.5 pl-5">
                                  {diagnosticResult.instructions.map((instruction: string, i: number) => (
                                    <li key={i}>{instruction}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}

                            <Button
                              onClick={() => setShowDebugPanel((v) => !v)}
                              variant="ghost"
                              size="sm"
                              className="px-0"
                            >
                              {showDebugPanel ? "Ocultar" : "Ver"} detalhes técnicos
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    {/* Painel de Debug Detalhado */}
                    {showDebugPanel && diagnosticResult ? (
                      <pre className="max-h-64 overflow-auto rounded-md border bg-muted p-3 text-xs text-muted-foreground">
                        {JSON.stringify(diagnosticResult, null, 2)}
                      </pre>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}

              <Button
                onClick={() => createInstance.mutate()}
                disabled={createInstance.isPending || !canManage || permLoading}
                className="w-full"
                size="lg"
              >
                {createInstance.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando QR Code...
                  </>
                ) : (
                  <>
                    <Smartphone className="mr-2 h-4 w-4" />
                    Conectar WhatsApp
                  </>
                )}
              </Button>

              {!canManage ? (
                <p className="text-xs text-muted-foreground">
                  Você não tem permissão para conectar/desconectar o WhatsApp neste workspace.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tem instância mas aguardando QR Code
  if ((instance.status === "qr_ready" || instance.status === "connecting") && instance.qr_code) {
    const qrValue = String(instance.qr_code ?? "");
    const qrIsDataUrl = qrValue.startsWith("data:image/");
    const qrLooksBase64 = !qrIsDataUrl && qrValue.length > 400 && /^[A-Za-z0-9+/=]+$/.test(qrValue);
    const qrSrc = qrIsDataUrl ? qrValue : qrLooksBase64 ? `data:image/png;base64,${qrValue}` : null;
    const canRenderSvg = !qrSrc && qrValue.length <= 1000;

    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 p-4">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>Escaneie o QR Code</CardTitle>
                <CardDescription>Abra o WhatsApp no seu celular e escaneie o código abaixo</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {statusLabel ? <Badge variant={statusLabel.variant}>{statusLabel.text}</Badge> : null}
                <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Atualizar">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <Card className="shadow-none">
              <CardContent className="grid place-items-center gap-3 p-6">
                <div className="rounded-xl border bg-background p-3">
                  {qrSrc ? (
                    <img src={qrSrc} alt="QR Code" className="h-64 w-64" />
                  ) : canRenderSvg ? (
                    <QRCodeSVG value={qrValue} size={256} includeMargin />
                  ) : (
                    <p className="text-xs text-muted-foreground">QR Code inválido ou muito grande.</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">O QR Code expira periodicamente. Se necessário, atualize.</p>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">Como escanear o QR Code</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">No Android:</p>
                    <p>1. WhatsApp → ⋮ → Aparelhos conectados → Conectar um aparelho</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">No iPhone:</p>
                    <p>1. WhatsApp → Configurações → Aparelhos conectados → Conectar um aparelho</p>
                  </div>
                  <p>2. Aponte a câmera para este QR Code</p>
                </CardContent>
              </Card>

              <Alert>
                <AlertTitle className="flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  Aguardando conexão...
                </AlertTitle>
                <AlertDescription>Assim que o WhatsApp confirmar, esta tela atualizará automaticamente.</AlertDescription>
              </Alert>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (window.confirm("Deseja cancelar a conexão?")) disconnectInstance.mutate(instance.id);
                }}
                disabled={disconnectInstance.isPending}
              >
                {disconnectInstance.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    Cancelar
                  </>
                )}
              </Button>

              <Button
                className="w-full"
                variant="destructive"
                onClick={() => {
                  if (
                    window.confirm(
                      "Isso vai remover a instância atual e gerar um novo QR Code para este workspace. Continuar?",
                    )
                  ) {
                    resetInstance.mutate(instance.id);
                  }
                }}
                disabled={resetInstance.isPending}
              >
                {resetInstance.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reconfigurando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reconfigurar instância
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Instância conectada com sucesso
  if (instance.status === "connected") {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 p-4">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  WhatsApp Conectado
                </CardTitle>
                <CardDescription>Sua conta está conectada e funcionando perfeitamente</CardDescription>
              </div>
              {statusLabel ? <Badge variant={statusLabel.variant}>{statusLabel.text}</Badge> : null}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <Card className="shadow-none">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {instance.profile_name?.substring(0, 2).toUpperCase() || "WA"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold">{instance.profile_name || "WhatsApp Business"}</p>
                    <p className="text-xs text-muted-foreground">{formatPhoneNumber(instance.phone_number || "")}</p>
                  </div>
                </div>

                <Badge className="w-fit" variant="secondary">
                  <Wifi className="mr-1 h-3.5 w-3.5" />
                  Online
                </Badge>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Status da conexão</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Conectado em</p>
                  <p className="text-sm font-medium">{instance.connected_at ? formatDate(instance.connected_at) : "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Última atividade</p>
                  <p className="text-sm font-medium">
                    {instance.last_seen_at ? formatRelativeTime(instance.last_seen_at) : "Agora"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Separator />

            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={() => navigate("/dashboard/conversas")} variant="outline" className="w-full">
                <MessageSquare className="mr-2 h-4 w-4" />
                Ver Conversas
              </Button>
              <Button onClick={() => navigate("/dashboard/automacoes")} variant="outline" className="w-full">
                <Zap className="mr-2 h-4 w-4" />
                Automações
              </Button>
            </div>

            <Alert>
              <AlertTitle>Dica</AlertTitle>
              <AlertDescription>
                Agora você pode criar automações, gerenciar conversas e enviar mensagens em massa através do ZapFllow!
              </AlertDescription>
            </Alert>

            <Button
              className="w-full"
              variant="destructive"
              onClick={() => {
                if (
                  window.confirm(
                    "Tem certeza que deseja desconectar o WhatsApp? Você precisará escanear o QR Code novamente para reconectar.",
                  )
                ) {
                  disconnectInstance.mutate(instance.id);
                }
              }}
              disabled={disconnectInstance.isPending}
            >
              {disconnectInstance.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Desconectando...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Desconectar WhatsApp
                </>
              )}
            </Button>

            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                if (
                  window.confirm(
                    "Isso vai remover a instância atual e gerar um novo QR Code para este workspace. Continuar?",
                  )
                ) {
                  resetInstance.mutate(instance.id);
                }
              }}
              disabled={resetInstance.isPending}
            >
              {resetInstance.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reconfigurando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reconfigurar (novo QR)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Status de erro
  if (instance.status === "error") {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Erro de Conexão
            </CardTitle>
            <CardDescription>Ocorreu um problema ao conectar o WhatsApp</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{instance.error_message || "Erro desconhecido ao conectar"}</AlertDescription>
            </Alert>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                onClick={() => resetInstance.mutate(instance.id)}
                disabled={resetInstance.isPending}
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reconfigurar instância
              </Button>

              <Button variant="outline" onClick={() => refetch()} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Status desconhecido
  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>Status desconhecido</CardTitle>
          <CardDescription>O status retornado foi: {instance.status}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
