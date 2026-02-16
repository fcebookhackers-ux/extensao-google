import * as React from "react";
import { AlertCircle } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

type Step = 1 | 2 | 3;

const reasonSchema = z.enum([
  "expensive",
  "not_using",
  "missing_features",
  "better_alternative",
  "testing",
  "other",
]);

export function CancelSubscriptionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [step, setStep] = React.useState<Step>(1);
  const [reason, setReason] = React.useState<z.infer<typeof reasonSchema> | "">("");
  const [otherText, setOtherText] = React.useState("");
  const [missingText, setMissingText] = React.useState("");
  const [confirmText, setConfirmText] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setStep(1);
    setReason("");
    setOtherText("");
    setMissingText("");
    setConfirmText("");
    setLoading(false);
  }, [open]);

  const next = () => {
    const parsed = reasonSchema.safeParse(reason);
    if (!parsed.success) {
      toast({ title: "Selecione um motivo", description: "Escolha uma opção para continuar." });
      return;
    }
    setStep(2);
  };

  const cancelNow = async () => {
    const ok = confirmText.trim().toUpperCase() === "CANCELAR";
    if (!ok) {
      toast({ title: "Confirmação inválida", description: "Digite CANCELAR para habilitar." });
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 650));
    setLoading(false);
    toast({ title: "Assinatura cancelada", description: "Acesso mantido até 27/02/2026 (mock)." });
    onOpenChange(false);
  };

  const reasonLabel: Record<z.infer<typeof reasonSchema>, string> = {
    expensive: "Muito caro",
    not_using: "Não estou usando",
    missing_features: "Faltam recursos que preciso",
    better_alternative: "Encontrei alternativa melhor",
    testing: "Apenas testando",
    other: "Outro",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancelar Assinatura</DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <div className="text-base font-medium">Antes de você ir...</div>
              <div className="text-sm text-muted-foreground">Nos ajude a melhorar. Por que está cancelando?</div>
            </div>

            <RadioGroup value={reason} onValueChange={(v) => setReason(v as any)} className="gap-3">
              {(Object.keys(reasonLabel) as Array<z.infer<typeof reasonSchema>>).map((k) => (
                <label key={k} className="flex items-center gap-3 rounded-md border p-3 text-sm">
                  <RadioGroupItem value={k} />
                  {reasonLabel[k]}
                </label>
              ))}
            </RadioGroup>

            {reason === "other" ? (
              <div className="space-y-2">
                <Label>Conte-nos mais</Label>
                <Textarea value={otherText} onChange={(e) => setOtherText(e.target.value)} placeholder="Digite aqui..." />
              </div>
            ) : null}
          </div>
        ) : step === 2 ? (
          <div className="space-y-4">
            {reason === "expensive" ? (
              <>
                <div className="text-base font-medium">Que tal um desconto?</div>
                <div className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-primary text-primary-foreground">20% OFF por 3 meses</Badge>
                    <div className="text-sm text-muted-foreground">Queremos você conosco!</div>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">R$ 157,60/mês</span> <span className="text-muted-foreground">por 3 meses</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={() => {
                      toast({ title: "Oferta aceita", description: "Desconto aplicado (mock)." });
                      onOpenChange(false);
                    }}
                  >
                    Aceitar Oferta
                  </Button>
                  <Button variant="outline" onClick={() => setStep(3)}>
                    Não, quero cancelar
                  </Button>
                </div>
              </>
            ) : reason === "missing_features" ? (
              <>
                <div>
                  <div className="text-base font-medium">Conte-nos mais</div>
                  <div className="text-sm text-muted-foreground">Que recursos você precisa?</div>
                </div>
                <Textarea value={missingText} onChange={(e) => setMissingText(e.target.value)} placeholder="Ex: multi-WhatsApp, SLA, integrações..." />
                <Button
                  onClick={() => {
                    toast({ title: "Feedback enviado", description: "Obrigado! (mock)" });
                    setStep(3);
                  }}
                >
                  Enviar Feedback
                </Button>
              </>
            ) : (
              <>
                <div className="text-base font-medium">Tem certeza?</div>
                <div className="text-sm text-muted-foreground">Você perderá acesso a ZapFllow, contatos e histórico.</div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Voltar
                  </Button>
                  <Button onClick={() => setStep(3)}>Sim, cancelar</Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-base font-medium">
              <AlertCircle className="h-5 w-5 text-destructive" /> Confirmação Final
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <div className="font-medium">Esta ação não pode ser desfeita. Você perderá:</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                <li>❌ Todas as ZapFllow ativas</li>
                <li>❌ Histórico de conversas (após 30 dias)</li>
                <li>❌ Acesso à plataforma</li>
                <li>✅ Você pode exportar seus dados antes de cancelar</li>
              </ul>
              <div className="mt-2 text-muted-foreground">Seu acesso será mantido até 27/02/2026 (fim do período pago).</div>
            </div>

            <div className="space-y-2">
              <Label>Digite 'CANCELAR' para confirmar</Label>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="CANCELAR" />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={loading} onClick={() => (step === 1 ? onOpenChange(false) : setStep((s) => (s === 3 ? 2 : 1)))}>
            Voltar
          </Button>
          {step === 1 ? (
            <Button onClick={next}>Continuar</Button>
          ) : step === 3 ? (
            <Button
              disabled={loading || confirmText.trim().toUpperCase() !== "CANCELAR"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={cancelNow}
            >
              {loading ? "Confirmando..." : "Confirmar Cancelamento"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
