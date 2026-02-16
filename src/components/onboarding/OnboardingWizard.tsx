import * as React from "react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Rocket,
  Upload,
  UserPlus,
  Wand2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getUserScopedKey,
  ONBOARDING_COMPLETED_KEY,
  ONBOARDING_SELECTED_TEMPLATE_KEY,
  safeGetLocalStorageItem,
  safeSetLocalStorageItem,
} from "@/components/onboarding/onboardingStorage";

// Reaproveita o estado mock existente da página ConectarWhatsApp
const WHATSAPP_CONNECTED_KEY = "zapfllow_whatsapp_connected";

type Step = 1 | 2 | 3 | 4 | 5;

type Props = {
  user: User;
};

function isProfileIncomplete(user: User) {
  const md: any = (user as any)?.user_metadata ?? {};
  const fullName = String(md?.full_name ?? "").trim();
  // Regra simples: se não tem nome, consideramos incompleto.
  // (Pode ser expandido depois para empresa/telefone.)
  return fullName.length === 0;
}

function ConfettiBurst({ className }: { className?: string }) {
  const pieces = React.useMemo(() => Array.from({ length: 18 }).map((_, i) => i), []);
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {pieces.map((i) => {
        const left = (i * 100) / pieces.length;
        const delay = (i % 6) * 60;
        const duration = 900 + (i % 5) * 120;
        const size = 6 + (i % 4) * 2;
        const rotate = (i % 2 ? 1 : -1) * (25 + (i % 7) * 8);
        const bg = i % 3 === 0 ? "hsl(var(--primary))" : i % 3 === 1 ? "hsl(var(--accent))" : "hsl(var(--secondary))";

        return (
          <span
            key={i}
            className="absolute top-0 opacity-0"
            style={{
              left: `${left}%`,
              width: size,
              height: size * 1.6,
              background: bg,
              borderRadius: 4,
              transform: `rotate(${rotate}deg)`,
              animation: `zapflow-confetti ${duration}ms ease-out ${delay}ms forwards`,
            }}
          />
        );
      })}

      <style>{`
        @keyframes zapflow-confetti {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 0; }
          12% { opacity: 1; }
          100% { transform: translateY(320px) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export function OnboardingWizard({ user }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const completedKey = React.useMemo(() => getUserScopedKey(user.id, ONBOARDING_COMPLETED_KEY), [user.id]);
  const templateKey = React.useMemo(() => getUserScopedKey(user.id, ONBOARDING_SELECTED_TEMPLATE_KEY), [user.id]);

  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>(1);

  // Estado do passo 2 (WhatsApp)
  const [whatsappConnected, setWhatsappConnected] = React.useState(false);

  // Estado do passo 3 (template)
  const [templateSelected, setTemplateSelected] = React.useState<string | null>(null);

  // Estado do passo 4 (contatos)
  const [contactsAddedCount, setContactsAddedCount] = React.useState<number>(0);

  // Checklist final
  const [finalChecklist, setFinalChecklist] = React.useState({
    testAutomation: false,
    exploreTemplates: false,
    inviteTeam: false,
  });

  const progressPct = React.useMemo(() => {
    if (step === 5) return 100;
    return ((step - 1) / 4) * 100;
  }, [step]);

  React.useEffect(() => {
    const alreadyCompleted = safeGetLocalStorageItem(completedKey) === "true";
    const incomplete = isProfileIncomplete(user);
    setOpen(!alreadyCompleted || incomplete);
  }, [completedKey, user]);

  React.useEffect(() => {
    // Mock: inicia sempre conectado no tutorial.
    if (!open) return;
    safeSetLocalStorageItem(WHATSAPP_CONNECTED_KEY, "true");
    setWhatsappConnected(true);
  }, [open]);

  React.useEffect(() => {
    const v = safeGetLocalStorageItem(templateKey);
    setTemplateSelected(v);
  }, [templateKey, open]);

  const closeAndPersist = () => {
    safeSetLocalStorageItem(completedKey, "true");
    setOpen(false);
  };

  const handleSkip = () => {
    closeAndPersist();
    toast({ title: "Tour pulado", description: "Você pode refazer depois nas configurações." });
  };

  const StepShell = ({
    title,
    description,
    rightAction,
    children,
    footer,
  }: {
    title: React.ReactNode;
    description?: React.ReactNode;
    rightAction?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
  }) => (
    <div className="grid gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {rightAction}
      </div>

      {children}

      {footer ? <div className="pt-2">{footer}</div> : null}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="w-[min(96vw,64rem)] max-w-4xl p-0 sm:rounded-xl"
        // Não fecha clicando fora
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="relative grid min-h-[80vh] grid-rows-[auto_1fr_auto] overflow-hidden bg-background">
          {/* header */}
          <div className="border-b p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <DialogTitle className="text-base">Configuração Inicial</DialogTitle>
                <DialogDescription>
                  Passo {Math.min(step, 4)}/4
                </DialogDescription>
              </div>
              <div className="min-w-[200px]">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progresso</span>
                  <span>{Math.round(progressPct)}%</span>
                </div>
                <Progress value={progressPct} className="h-2" />
              </div>
            </div>
          </div>

          {/* body */}
          <div className="p-6">
            {step === 1 && (
              <StepShell
                title={
                  <span>
                    Bem-vindo ao ZapFllow! <span className="align-middle">🎉</span>
                  </span>
                }
                description="Vamos configurar sua conta em 4 passos simples. Leva menos de 5 minutos!"
                rightAction={
                  <Button variant="ghost" onClick={handleSkip}>
                    Pular Tutorial
                  </Button>
                }
                footer={
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <Button size="lg" onClick={() => setStep(2)}>
                      Começar
                    </Button>
                  </div>
                }
              >
                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <Card className="relative overflow-hidden">
                    <ConfettiBurst className="opacity-70" />
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5" /> Tour rápido
                      </CardTitle>
                      <CardDescription>Um resumo do que você vai conseguir fazer.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border bg-card p-3">
                          <p className="text-sm font-semibold">💬 Automatize conversas</p>
                          <p className="mt-1 text-xs text-muted-foreground">Fluxos, tags e respostas rápidas</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3">
                          <p className="text-sm font-semibold">📊 Acompanhe resultados</p>
                          <p className="mt-1 text-xs text-muted-foreground">KPIs e relatórios em tempo real</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3">
                          <p className="text-sm font-semibold">🚀 Venda 24/7</p>
                          <p className="mt-1 text-xs text-muted-foreground">Campanhas e ZapFllow sempre ativas</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card">
                    <CardHeader>
                      <CardTitle>Em 4 passos</CardTitle>
                      <CardDescription>Você vai sair daqui pronto para usar.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ol className="grid gap-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <span className="grid h-6 w-6 place-items-center rounded-full border bg-background text-xs font-semibold">1</span>
                          Bem-vindo
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="grid h-6 w-6 place-items-center rounded-full border bg-background text-xs font-semibold">2</span>
                          Conectar WhatsApp
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="grid h-6 w-6 place-items-center rounded-full border bg-background text-xs font-semibold">3</span>
                          Criar ZapFllow
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="grid h-6 w-6 place-items-center rounded-full border bg-background text-xs font-semibold">4</span>
                          Importar contatos
                        </li>
                      </ol>
                    </CardContent>
                  </Card>
                </div>
              </StepShell>
            )}

            {step === 2 && (
              <StepShell
                title="Conecte seu WhatsApp Business"
                description="Este é o coração do ZapFllow"
                rightAction={
                  <Button variant="ghost" onClick={handleSkip}>
                    Pular Tutorial
                  </Button>
                }
                footer={
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      Voltar
                    </Button>
                    {whatsappConnected ? (
                      <Button size="lg" onClick={() => setStep(3)}>
                        Próximo Passo
                      </Button>
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button variant="outline" onClick={() => setStep(3)}>
                          Fazer Depois
                        </Button>
                        <Button
                          size="lg"
                          onClick={() => {
                            safeSetLocalStorageItem(WHATSAPP_CONNECTED_KEY, "true");
                            setWhatsappConnected(true);
                            toast({ title: "✅ WhatsApp conectado!", description: "Conexão simulada concluída." });
                          }}
                        >
                          Conectar Agora
                        </Button>
                      </div>
                    )}
                  </div>
                }
              >
                <Card className="relative overflow-hidden">
                  {whatsappConnected ? <ConfettiBurst /> : null}
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" /> Conexão
                    </CardTitle>
                    <CardDescription>Mini-visão da conexão via QR (simulado)</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 lg:grid-cols-[280px_1fr]">
                    <div className="grid place-items-center rounded-xl border bg-card p-6">
                      <div className="grid h-40 w-40 place-items-center rounded-lg border bg-background">
                        <span className="text-xs text-muted-foreground">QR Code</span>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">Expira em 60s (simulado)</p>
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Como conectar (rápido)</p>
                      <ol className="grid gap-2 text-sm text-muted-foreground">
                        <li>1) Abra o WhatsApp Business no celular</li>
                        <li>2) Acesse Dispositivos Conectados</li>
                        <li>3) Escaneie o QR Code acima</li>
                      </ol>
                      {whatsappConnected ? (
                        <div className="mt-2 flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
                          <CheckCircle2 className="h-5 w-5" /> <span className="font-medium">WhatsApp conectado!</span>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>

                <div className="text-xs text-muted-foreground">
                  Dica: você pode ajustar conexão depois em <span className="font-medium">Conectar WhatsApp</span> no menu.
                </div>
              </StepShell>
            )}

            {step === 3 && (
              <StepShell
                title="Crie Seu Primeiro ZapFllow"
                description="Escolha um template para começar rápido"
                rightAction={
                  <Button variant="ghost" onClick={handleSkip}>
                    Pular Tutorial
                  </Button>
                }
                footer={
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      Voltar
                    </Button>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button variant="outline" onClick={() => setStep(4)}>
                        Pular, Criar Depois
                      </Button>
                      <Button size="lg" disabled={!templateSelected} onClick={() => setStep(4)}>
                        Próximo Passo
                      </Button>
                    </div>
                  </div>
                }
              >
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    {
                      id: "welcome",
                      title: "Boas-vindas",
                      desc: "Responda automaticamente novos contatos",
                      preview: "Entrada → Saudação → Tag: Lead",
                    },
                    {
                      id: "schedule",
                      title: "Agendamento",
                      desc: "Direcione para horários e confirmações",
                      preview: "Pergunta → Opções → Confirmar",
                    },
                    {
                      id: "mainmenu",
                      title: "Menu Principal",
                      desc: "Um menu com atalhos de atendimento",
                      preview: "Menu → Escolha → Ação",
                    },
                  ].map((t) => {
                    const selected = templateSelected === t.id;
                    return (
                      <Card
                        key={t.id}
                        className={cn(
                          "transition-transform duration-200 hover:scale-[1.02]",
                          selected ? "ring-2 ring-ring" : "",
                        )}
                      >
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between gap-2">
                            <span>{t.title}</span>
                            {selected ? <CheckCircle2 className="h-5 w-5" /> : <Wand2 className="h-5 w-5 text-muted-foreground" />}
                          </CardTitle>
                          <CardDescription>{t.desc}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="rounded-lg border bg-card p-3 text-xs text-muted-foreground">
                            <p className="font-medium text-foreground">Preview</p>
                            <p className="mt-1">{t.preview}</p>
                          </div>
                          <Button
                            className="w-full"
                            variant={selected ? "secondary" : "default"}
                            onClick={() => {
                              safeSetLocalStorageItem(templateKey, t.id);
                              setTemplateSelected(t.id);
                              toast({
                                title: "Template selecionado",
                                description: `“${t.title}” pronto para abrir no editor (simulação).`,
                              });
                            }}
                          >
                            {selected ? "Selecionado" : "Usar Este"}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {templateSelected ? (
                  <div className="rounded-lg border bg-card p-4 text-sm">
                    <p className="font-medium">✅ Template carregado em background</p>
                    <p className="mt-1 text-muted-foreground">Você pode abrir o editor depois para personalizar.</p>
                  </div>
                ) : null}
              </StepShell>
            )}

            {step === 4 && (
              <StepShell
                title="Adicione Seus Primeiros Contatos"
                description="Importe de um arquivo CSV ou adicione manualmente"
                rightAction={
                  <Button variant="ghost" onClick={handleSkip}>
                    Pular Tutorial
                  </Button>
                }
                footer={
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button variant="outline" onClick={() => setStep(3)}>
                      Voltar
                    </Button>
                    <Button size="lg" onClick={() => setStep(5)}>
                      Concluir
                    </Button>
                  </div>
                }
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="transition-transform duration-200 hover:scale-[1.02]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" /> Importar CSV
                      </CardTitle>
                      <CardDescription>Envie sua lista e comece rápido</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          if (!e.target.files?.length) return;
                          // Simulação
                          const added = 23;
                          setContactsAddedCount((c) => c + added);
                          toast({ title: "✅ Contatos importados", description: `${added} contatos adicionados (simulação).` });
                        }}
                      />
                      <Button className="w-full" variant="outline" onClick={() => navigate("/dashboard/contatos")}>
                        Abrir Contatos
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="transition-transform duration-200 hover:scale-[1.02]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" /> Adicionar Manualmente
                      </CardTitle>
                      <CardDescription>Cadastre 1 contato por vez</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button
                        className="w-full"
                        onClick={() => {
                          const added = 1;
                          setContactsAddedCount((c) => c + added);
                          toast({ title: "Contato adicionado", description: "1 contato adicionado (simulação)." });
                        }}
                      >
                        Adicionar Contato
                      </Button>
                      <Button className="w-full" variant="outline" onClick={() => navigate("/dashboard/contatos")}>
                        Ver Lista
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="transition-transform duration-200 hover:scale-[1.02]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" /> Fazer Depois
                      </CardTitle>
                      <CardDescription>Você pode importar quando quiser</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full" variant="secondary" onClick={() => setStep(5)}>
                        Continuar
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {contactsAddedCount > 0 ? (
                  <div className="rounded-lg border bg-card p-4 text-sm">
                    <p className="font-medium">✅ {contactsAddedCount} contatos adicionados!</p>
                    <p className="mt-1 text-muted-foreground">Perfeito. Você já pode iniciar conversas e campanhas.</p>
                  </div>
                ) : null}
              </StepShell>
            )}

            {step === 5 && (
              <StepShell
                title={
                  <span className="flex items-center gap-2">
                    <Rocket className="h-6 w-6" /> Tudo Pronto! <span>🚀</span>
                  </span>
                }
                description="Sua conta está configurada. Agora é hora de automatizar e vender mais!"
                footer={
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button variant="outline" onClick={() => setStep(4)}>
                      Voltar
                    </Button>
                    <Button
                      size="lg"
                      onClick={() => {
                        closeAndPersist();
                        toast({ title: "✅ Onboarding concluído", description: "Bem-vindo!" });
                        navigate("/dashboard/inicio", { replace: true });
                      }}
                    >
                      Ir para Dashboard
                    </Button>
                  </div>
                }
              >
                <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                  <Card className="relative overflow-hidden">
                    <ConfettiBurst className="opacity-80" />
                    <CardHeader>
                      <CardTitle>Próximos passos</CardTitle>
                      <CardDescription>Uma checklist rápida para continuar avançando</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <label className="flex items-start gap-3">
                        <Checkbox
                          checked={finalChecklist.testAutomation}
                          onCheckedChange={(v) => setFinalChecklist((s) => ({ ...s, testAutomation: Boolean(v) }))}
                        />
                        <span>
                            <span className="block text-sm font-medium">Testar seu primeiro ZapFllow</span>
                          <span className="block text-xs text-muted-foreground">Faça um disparo de teste para validar.</span>
                        </span>
                      </label>
                      <label className="flex items-start gap-3">
                        <Checkbox
                          checked={finalChecklist.exploreTemplates}
                          onCheckedChange={(v) => setFinalChecklist((s) => ({ ...s, exploreTemplates: Boolean(v) }))}
                        />
                        <span>
                          <span className="block text-sm font-medium">Explorar templates prontos</span>
                          <span className="block text-xs text-muted-foreground">Acelere usando modelos existentes.</span>
                        </span>
                      </label>
                      <label className="flex items-start gap-3">
                        <Checkbox
                          checked={finalChecklist.inviteTeam}
                          onCheckedChange={(v) => setFinalChecklist((s) => ({ ...s, inviteTeam: Boolean(v) }))}
                        />
                        <span>
                          <span className="block text-sm font-medium">Convidar sua equipe</span>
                          <span className="block text-xs text-muted-foreground">Trabalhe com permissões por perfil.</span>
                        </span>
                      </label>
                      <a
                        className="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          toast({ title: "Em breve", description: "Tutorial completo será publicado em breve." });
                        }}
                      >
                        Ver tutorial completo <ExternalLink className="h-4 w-4" />
                      </a>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Configurações rápidas</CardTitle>
                      <CardDescription>Ajustes recomendados</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label>Frequência de sincronização (exemplo)</Label>
                        <Select defaultValue="realtime">
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="realtime">Tempo real</SelectItem>
                            <SelectItem value="hourly">A cada hora</SelectItem>
                            <SelectItem value="daily">Diariamente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Estas opções são demonstrativas e serão conectadas ao backend depois.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </StepShell>
            )}
          </div>

          {/* footer (rodapé fixo opcional) */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Não fechável por fora • ESC bloqueado</span>
              <button
                className="underline-offset-4 hover:underline"
                onClick={() => {
                  // “Refazer Tour” não implementado aqui; deixamos o reset fácil.
                  safeSetLocalStorageItem(completedKey, "false");
                  toast({ title: "Tour resetado", description: "Ele aparecerá novamente ao recarregar." });
                }}
              >
                Refazer Tour
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
