import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  BarChart,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  MessageCircle,
  Send,
  Settings,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis } from "recharts";
import { useOnboarding } from "@/hooks/useOnboarding";

type ConnectionMethod = "qr" | "pairing" | "api";
type Provider = "Z-API" | "Evolution API" | "360dialog" | "Outro";

const STORAGE_KEY = "zapfllow_whatsapp_connected";

function formatMmSs(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ConectarWhatsapp() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { completeStep } = useOnboarding();

  const [connected, setConnected] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // NÃO CONECTADO
  const [method, setMethod] = React.useState<ConnectionMethod>("qr");
  const [qrExpiresIn, setQrExpiresIn] = React.useState(60);
  const [qrExpired, setQrExpired] = React.useState(false);
  const [qrStatus, setQrStatus] = React.useState<"waiting" | "success">("waiting");

  const [pairCode, setPairCode] = React.useState("");

  const [provider, setProvider] = React.useState<Provider>("Z-API");
  const [apiKey, setApiKey] = React.useState("");
  const [instanceId, setInstanceId] = React.useState("");
  const [acceptApiTerms, setAcceptApiTerms] = React.useState(false);
  const [showApiKey, setShowApiKey] = React.useState(false);

  const [testing, setTesting] = React.useState(false);

  // CONECTADO
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [testMessageOpen, setTestMessageOpen] = React.useState(false);
  const [testMessage, setTestMessage] = React.useState("Olá! Teste de conexão ✅");
  const [stable] = React.useState(true);

  const canConnectApi = apiKey.trim().length > 0 && instanceId.trim().length > 0 && acceptApiTerms;
  const canTestConnection = method === "qr" ? true : method === "pairing" ? pairCode.trim().length === 6 : canConnectApi;

  // QR timer + simulação de leitura
  React.useEffect(() => {
    if (connected) return;
    if (method !== "qr") return;

    setQrStatus("waiting");
    setQrExpired(false);
    setQrExpiresIn(60);

    const tick = window.setInterval(() => {
      setQrExpiresIn((s) => {
        if (s <= 1) {
          window.clearInterval(tick);
          setQrExpired(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    const scan = window.setTimeout(() => {
      setQrStatus("success");
    }, 3000);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(scan);
    };
  }, [connected, method]);

  const generateNewQr = () => {
    setQrStatus("waiting");
    setQrExpired(false);
    setQrExpiresIn(60);
    toast({ title: "Novo QR Code gerado", description: "Aponte a câmera para conectar." });
  };

  const persistConnected = (value: boolean) => {
    setConnected(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
    } catch {
      // ignore
    }
  };

  const handleTestConnection = async () => {
    if (!canTestConnection) {
      toast({ title: "Verifique os dados", description: "Preencha os campos obrigatórios para conectar.", variant: "destructive" });
      return;
    }

    setTesting(true);
    await new Promise((r) => window.setTimeout(r, 1200));
    setTesting(false);

    persistConnected(true);
    completeStep("whatsapp_connected", { method });
    toast({ title: "WhatsApp conectado com sucesso!", description: "Tudo pronto para ZapFllow." });
    navigate("/dashboard/inicio", { replace: true });
  };

  const handleDisconnect = () => {
    persistConnected(false);
    setMethod("qr");
    toast({ title: "WhatsApp desconectado", description: "Seu ZapFllow foi pausado (simulação)." });
  };

  const Help = (
    <Card className="bg-card shadow-sm">
      <CardHeader>
        <CardTitle>Ajuda rápida</CardTitle>
        <CardDescription>Dúvidas comuns sobre a conexão.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="h1">
            <AccordionTrigger>Posso usar o mesmo número em outro lugar?</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground">Não. O número só pode estar conectado em um lugar por vez.</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="h2">
            <AccordionTrigger>E se eu perder a conexão?</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground">
                      O ZapFllow pausa automaticamente. Reconecte para retomar.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="h3">
            <AccordionTrigger>É seguro conectar meu WhatsApp?</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground">
                Sim! Usamos protocolo oficial do WhatsApp. Seus dados são criptografados.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <a
          href="#"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
        >
          Ver documentação completa
        </a>
      </CardContent>
    </Card>
  );

  if (connected) {
    const uptimeData = [98, 99, 98, 97, 99, 98, 98].map((v, i) => ({ x: i, v }));

    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card className="bg-brand-primary-lighter shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-10 w-10 text-brand-primary-light" />
                  <div>
                    <CardTitle>✅ WhatsApp Conectado com Sucesso!</CardTitle>
                    <CardDescription>Seu número está pronto para ZapFllow.</CardDescription>
                  </div>
                </div>
                <Badge className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light/90">
                  Conectado e Estável
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-background text-sm font-semibold">ME</div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold">Minha Empresa LTDA</p>
                  <p className="text-xs text-muted-foreground">+55 (11) 98765-4321</p>
                </div>
              </div>

              <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    Detalhes técnicos
                    <span className="text-xs text-muted-foreground">{detailsOpen ? "Ocultar" : "Ver"}</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 rounded-lg border bg-background p-3">
                  <ul className="grid gap-1 text-sm text-muted-foreground">
                    <li>Última sincronização: Há 2 minutos</li>
                    <li>Mensagens na fila: 0</li>
                    <li>Latência: 45ms</li>
                    <li>Bateria do dispositivo: 87%</li>
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-brand-primary-light" /> Enviar Mensagem de Teste
                </CardTitle>
                <CardDescription>Envie uma mensagem para seu próprio número para testar</CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={testMessageOpen} onOpenChange={setTestMessageOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light/90">
                      Enviar Mensagem de Teste
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Mensagem de teste</DialogTitle>
                      <DialogDescription>Simulação: enviaremos para seu próprio número.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label>Mensagem</Label>
                      <Textarea value={testMessage} onChange={(e) => setTestMessage(e.target.value)} />
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => {
                          setTestMessageOpen(false);
                          toast({ title: "Mensagem enviada", description: "Enviamos sua mensagem de teste (simulação)." });
                        }}
                        className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light/90"
                      >
                        Confirmar envio
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-primary" /> Ver Estatísticas de Conexão
                </CardTitle>
                <CardDescription>Relatórios e métricas de estabilidade</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/dashboard/relatorios?tab=whatsapp">Abrir Relatórios</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card shadow-sm">
            <CardHeader>
              <CardTitle>Saúde da Conexão</CardTitle>
              <CardDescription>Estável - 98%</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Estabilidade</span>
                  <span className="font-medium">98%</span>
                </div>
                <Progress value={98} className="h-3" />
              </div>

              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm font-medium">Últimas 24h</p>
                <div className="mt-2 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={uptimeData} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                      <XAxis dataKey="x" hide />
                      <RechartsTooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 10,
                        }}
                      />
                      <Line type="monotone" dataKey="v" stroke="hsl(var(--brand-primary-light))" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium">Últimos eventos</p>
                <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                  <li>23/01 14:32 - Conectado</li>
                  <li>23/01 18:45 - Sincronização automática</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm">
            <CardHeader>
              <CardTitle>Ações de Gerenciamento</CardTitle>
              <CardDescription>Controle a conexão e preferências.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                    Desconectar WhatsApp
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza? Todo ZapFllow será pausado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleDisconnect}
                    >
                      Sim, Desconectar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {!stable ? (
                <Button className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light/90">Reconectar</Button>
              ) : (
                <Button variant="outline" disabled>
                  Reconectar
                </Button>
              )}

              <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Settings className="h-4 w-4" />
                    Configurações Avançadas
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configurações Avançadas</DialogTitle>
                    <DialogDescription>Ajustes técnicos (simulação).</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Webhook URL</Label>
                      <Input placeholder="https://seu-dominio.com/webhook" />
                    </div>

                    <div className="grid gap-3">
                      <label className="flex items-center justify-between gap-3 text-sm">
                        <span>Notificações de mensagens</span>
                        <Switch defaultChecked aria-label="Notificações" />
                      </label>
                      <label className="flex items-center justify-between gap-3 text-sm">
                        <span>Leitura automática</span>
                        <Switch aria-label="Leitura automática" />
                      </label>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button onClick={() => setAdvancedOpen(false)} className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light/90">
                      Salvar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-20 lg:h-fit">{Help}</div>
      </div>
    );
  }

  const QrPanel = (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <div className="grid gap-3">
          {[
            "1️⃣ Abra o WhatsApp no seu celular",
            "2️⃣ Toque em Configurações > Aparelhos Conectados",
            "3️⃣ Toque em 'Conectar um aparelho'",
            "4️⃣ Aponte a câmera para o QR Code abaixo",
          ].map((t) => (
            <div key={t} className="rounded-lg border bg-background p-3 text-sm">
              {t}
            </div>
          ))}
        </div>

        <Card className="bg-card shadow-sm">
          <CardHeader>
            <CardTitle>QR Code</CardTitle>
            <CardDescription>Código válido por 60 segundos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="mx-auto grid h-64 w-64 place-items-center rounded-xl border-2 border-brand-primary-light bg-background p-4">
              <div className="grid h-full w-full place-items-center rounded-lg border bg-muted/30">
                <MessageCircle className="h-20 w-20 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">QR Code (simulado)</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Código válido por 60 segundos</p>
              <p className={cn("text-sm font-medium", qrExpired ? "text-destructive" : "text-foreground")}>{formatMmSs(qrExpiresIn)}</p>
            </div>

            {qrExpired ? (
              <Button variant="outline" className="w-full" onClick={generateNewQr}>
                Gerar Novo QR Code
              </Button>
            ) : null}

            <div className="rounded-lg border bg-background p-3">
              {qrStatus === "waiting" ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aguardando leitura do QR Code...
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-brand-primary-light">
                  <CheckCircle2 className="h-4 w-4" /> ✅ WhatsApp conectado com sucesso!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <Alert className="border-primary/25 bg-primary/5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Dica</AlertTitle>
          <AlertDescription>Se o QR expirar, gere um novo código e tente novamente.</AlertDescription>
        </Alert>
        {Help}
      </div>
    </div>
  );

  const PairingPanel = (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Código de emparelhamento</CardTitle>
          <CardDescription>Digite o código de 6 dígitos que aparece no WhatsApp Web</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InputOTP maxLength={6} value={pairCode} onChange={setPairCode}>
            <InputOTPGroup>
              {Array.from({ length: 6 }).map((_, idx) => (
                <InputOTPSlot key={idx} index={idx} />
              ))}
            </InputOTPGroup>
          </InputOTP>

          <Button
            className="w-full bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light/90"
            disabled={pairCode.trim().length !== 6}
            onClick={() => toast({ title: "Código enviado", description: "Agora clique em 'Testar Conexão' (simulação)." })}
          >
            Conectar com Código
          </Button>

          <p className="text-sm text-muted-foreground">
            Onde encontro? WhatsApp &gt; Aparelhos Conectados &gt; Conectar via código
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">{Help}</div>
    </div>
  );

  const ApiPanel = (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Alert className="border-primary/25 bg-primary/5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Para usuários avançados</AlertTitle>
          <AlertDescription>Para usuários que já possuem API oficial do WhatsApp</AlertDescription>
        </Alert>

        <Card className="bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Conectar via API Key</CardTitle>
            <CardDescription>Cole sua API Key de provedores como Z-API, Evolution API ou 360dialog</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Z-API">Z-API</SelectItem>
                  <SelectItem value="Evolution API">Evolution API</SelectItem>
                  <SelectItem value="360dialog">360dialog</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>API Key</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowApiKey((v) => !v)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showApiKey ? "Ocultar" : "Mostrar"}
                </Button>
              </div>
              <Textarea
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Cole sua chave de API aqui"
                style={showApiKey ? undefined : ({ WebkitTextSecurity: "disc" } as React.CSSProperties)}
              />
              <p className="text-xs text-muted-foreground">Provider selecionado: {provider}</p>
            </div>

            <div className="space-y-2">
              <Label>Instance ID</Label>
              <Input value={instanceId} onChange={(e) => setInstanceId(e.target.value)} placeholder="ex: instance_123" />
            </div>

            <a
              href="#"
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm text-primary underline-offset-4 hover:underline"
            >
              Como obter minha API Key?
            </a>

            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <Checkbox checked={acceptApiTerms} onCheckedChange={(v) => setAcceptApiTerms(!!v)} />
              Aceito que a plataforma acesse meu WhatsApp Business conforme Termos de Uso
            </label>

            <Button
              className="w-full bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light/90"
              disabled={!canConnectApi}
              onClick={() => toast({ title: "API validada", description: "Agora clique em 'Testar Conexão' (simulação)." })}
            >
              Conectar API
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">{Help}</div>
    </div>
  );

  const Methods = isMobile ? (
    <Accordion
      type="single"
      collapsible
      value={method}
      onValueChange={(v) => setMethod(((v || "qr") as ConnectionMethod))}
      className="w-full"
    >
      <AccordionItem value="qr">
        <AccordionTrigger>QR Code (mais simples)</AccordionTrigger>
        <AccordionContent>
          <div className="pt-4">{QrPanel}</div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="pairing">
        <AccordionTrigger>Código de Emparelhamento</AccordionTrigger>
        <AccordionContent>
          <div className="pt-4">{PairingPanel}</div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="api">
        <AccordionTrigger>API Key (avançado)</AccordionTrigger>
        <AccordionContent>
          <div className="pt-4">{ApiPanel}</div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ) : (
    <Tabs value={method} onValueChange={(v) => setMethod(v as ConnectionMethod)}>
      <TabsList className="h-auto w-full justify-start">
        <TabsTrigger value="qr">QR Code</TabsTrigger>
        <TabsTrigger value="pairing">Código</TabsTrigger>
        <TabsTrigger value="api">API Key</TabsTrigger>
      </TabsList>
      <TabsContent value="qr" className="mt-6">
        {QrPanel}
      </TabsContent>
      <TabsContent value="pairing" className="mt-6">
        {PairingPanel}
      </TabsContent>
      <TabsContent value="api" className="mt-6">
        {ApiPanel}
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="space-y-6">
      <Card className="bg-card shadow-sm">
        <CardHeader>
          <div className="grid gap-6 md:grid-cols-[1fr_220px] md:items-center">
            <div className="space-y-2">
              <CardTitle className="text-2xl">Conecte seu WhatsApp Business em 2 Minutos</CardTitle>
              <CardDescription>Escolha a melhor forma de conectar seu número oficial</CardDescription>
            </div>
            <div className="hidden md:flex justify-end">
              <div className="grid h-24 w-24 place-items-center rounded-2xl bg-muted/30">
                <MessageCircle className="h-12 w-12 text-brand-primary-light" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {Methods}

      <div className="sticky bottom-4 z-10">
        <Card className="bg-background/80 backdrop-blur shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Botão principal</p>
              <p className="text-sm text-muted-foreground">Clique para validar e concluir a conexão (simulação).</p>
            </div>
            <Button
              size="lg"
              className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light/90"
              onClick={handleTestConnection}
              disabled={testing || !canTestConnection}
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Testar Conexão
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
