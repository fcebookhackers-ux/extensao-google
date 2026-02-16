import * as React from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ExternalLink, Smile } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import type { MessageTemplate, TemplateCategory, TemplateLanguage, TemplateHeader, TemplateButton } from "./templatesMock";
import { WhatsAppTemplatePreview } from "./components/WhatsAppTemplatePreview";
import { VariableInsertPopover } from "./components/VariableInsertPopover";
import { TemplateButtonsEditor } from "./components/TemplateButtonsEditor";

const NameSchema = z
  .string()
  .trim()
  .min(3, "Informe um nome")
  .max(64, "Máximo 64 caracteres")
  .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e underscore")
  .refine((v) => !v.includes("__"), "Evite underscores duplicados");

const Step1Schema = z.object({
  name: NameSchema,
  category: z.enum(["marketing", "utility", "authentication"]),
  language: z.enum(["pt_BR", "es", "en"]),
  description: z.string().trim().max(200, "Máximo 200 caracteres").optional().or(z.literal("")),
});

const Step2Schema = z.object({
  headerType: z.enum(["none", "text", "image", "video", "document"]),
  headerText: z
    .string()
    .trim()
    .max(60, "Máximo 60 caracteres")
    .refine((v) => !/\{\{\d+\}\}/.test(v), "Não use variáveis no header")
    .optional()
    .or(z.literal("")),
  body: z.string().trim().min(1, "Body é obrigatório").max(1024, "Máximo 1024 caracteres"),
  footer: z.string().trim().max(60, "Máximo 60 caracteres").optional().or(z.literal("")),
  buttonsType: z.enum(["none", "cta", "quick_reply"]),
});

const Step3Schema = z.object({
  checklistGuidelines: z.boolean().refine((v) => v, { message: "Confirme que segue as diretrizes" }),
  checklistOptin: z.boolean(),
  checklistVars: z.boolean().refine((v) => v, { message: "Confirme variáveis" }),
  checklistText: z.boolean().refine((v) => v, { message: "Confirme revisão" }),
});

const FormSchema = Step1Schema.merge(Step2Schema)
  .merge(Step3Schema)
  .superRefine((v, ctx) => {
    if (v.category === "marketing" && !v.checklistOptin) {
      ctx.addIssue({ code: "custom", path: ["checklistOptin"], message: "Para Marketing, confirme que há opt-in" });
    }
  });
type FormValues = z.infer<typeof FormSchema>;

function extractVarNumbers(text: string) {
  const matches = [...text.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
  return Array.from(new Set(matches)).sort((a, b) => a - b);
}

function buildHeader(v: FormValues): TemplateHeader {
  if (v.headerType === "none") return { type: "none" };
  if (v.headerType === "text") return { type: "text", text: v.headerText?.trim() || "" };
  return { type: v.headerType } as any;
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (t: MessageTemplate) => void;
}) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const [ctaButtons, setCtaButtons] = React.useState<TemplateButton[]>([]);
  const [qrButtons, setQrButtons] = React.useState<TemplateButton[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      category: "utility",
      language: "pt_BR",
      description: "",

      headerType: "none",
      headerText: "",
      body: "",
      footer: "",
      buttonsType: "none",

      checklistGuidelines: false,
      checklistOptin: false,
      checklistVars: false,
      checklistText: false,
    },
    mode: "onChange",
  });

  React.useEffect(() => {
    if (!open) {
      setStep(1);
      setCtaButtons([]);
      setQrButtons([]);
      form.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const values = form.watch();
  const header = buildHeader(values);
  const bodyVars = extractVarNumbers(values.body || "");
  const buttons = values.buttonsType === "cta" ? ctaButtons : values.buttonsType === "quick_reply" ? qrButtons : [];

  const nextVar = (bodyVars.at(-1) ?? 0) + 1;
  const canInsertVar = nextVar <= 10;

  const stepProgress = step === 1 ? 33 : step === 2 ? 66 : 100;

  const validateStep = async (target: 1 | 2 | 3) => {
    if (target === 1) return true;
    if (target === 2) {
      const ok = await form.trigger(["name", "category", "language", "description"]);
      return ok;
    }
    if (target === 3) {
      const ok = await form.trigger(["headerType", "headerText", "body", "footer", "buttonsType"]);
      return ok;
    }
    return true;
  };

  const handleNext = async () => {
    const ok = await validateStep((step + 1) as any);
    if (!ok) return;
    setStep((s) => (s === 1 ? 2 : 3));
  };

  const handleBack = () => setStep((s) => (s === 3 ? 2 : 1));

  const insertToken = (insert: string) => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    const start = ta.selectionStart ?? (values.body?.length ?? 0);
    const end = ta.selectionEnd ?? start;
    const before = (values.body ?? "").slice(0, start);
    const after = (values.body ?? "").slice(end);
    const next = `${before}${insert}${after}`;
    form.setValue("body", next, { shouldValidate: true, shouldDirty: true });
    requestAnimationFrame(() => {
      ta.focus();
      const caret = start + insert.length;
      ta.setSelectionRange(caret, caret);
    });
  };

  const addEmoji = (emoji: string) => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    const start = ta.selectionStart ?? (values.body?.length ?? 0);
    const end = ta.selectionEnd ?? start;
    const before = (values.body ?? "").slice(0, start);
    const after = (values.body ?? "").slice(end);
    const next = `${before}${emoji}${after}`;
    form.setValue("body", next, { shouldValidate: true, shouldDirty: true });
    requestAnimationFrame(() => {
      ta.focus();
      const caret = start + emoji.length;
      ta.setSelectionRange(caret, caret);
    });
  };

  const onSubmit = form.handleSubmit(async (data) => {
    const ok = await form.trigger(["checklistGuidelines", "checklistVars", "checklistText"]);
    if (!ok) return;

    const now = new Date().toISOString();
    const created: MessageTemplate = {
      id: `tmp_${crypto.randomUUID()}`,
      name: data.name,
      description: data.description?.trim() || "—",
      status: "pending",
      category: data.category as TemplateCategory,
      language: data.language as TemplateLanguage,
      createdAt: now,
      updatedAt: now,
      content: {
        header: buildHeader(data),
        body: data.body.trim(),
        footer: data.footer?.trim() ? data.footer.trim() : undefined,
        buttons: buttons.length ? buttons : undefined,
      },
      meta: { pendingSinceHours: 0 },
    };

    onCreated(created);
  });

  const renderStep = () => {
    const error = form.formState.errors;

    if (step === 1) {
      return (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Template *</label>
              <Input
                placeholder="ex: confirmacao_agendamento"
                {...form.register("name")}
                aria-invalid={!!error.name}
              />
              {error.name ? <p className="text-sm font-medium text-destructive">{String(error.name.message)}</p> : null}
              <p className="text-xs text-muted-foreground">Formato: letras_minusculas_underscores</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria *</label>
              <Select value={values.category} onValueChange={(v) => form.setValue("category", v as any, { shouldValidate: true })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="utility">Utilidade</SelectItem>
                  <SelectItem value="authentication">Autenticação</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Idioma *</label>
              <Select value={values.language} onValueChange={(v) => form.setValue("language", v as any, { shouldValidate: true })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt_BR">Português (Brasil)</SelectItem>
                  <SelectItem value="es">Espanhol</SelectItem>
                  <SelectItem value="en">Inglês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea placeholder="Breve descrição do propósito deste template" rows={3} {...form.register("description")} />
              {error.description ? (
                <p className="text-sm font-medium text-destructive">{String(error.description.message)}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">Max 200 caracteres</p>
            </div>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Header (opcional)</p>
              <RadioGroup value={values.headerType} onValueChange={(v) => form.setValue("headerType", v as any, { shouldValidate: true })}>
                {(
                  [
                    { v: "none", l: "Nenhum" },
                    { v: "text", l: "Texto" },
                    { v: "image", l: "Imagem" },
                    { v: "video", l: "Vídeo" },
                    { v: "document", l: "Documento" },
                  ] as const
                ).map((opt) => (
                  <label key={opt.v} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value={opt.v} />
                    <span>{opt.l}</span>
                  </label>
                ))}
              </RadioGroup>

              {values.headerType === "text" ? (
                <div className="mt-3 space-y-2">
                  <label className="text-sm font-medium">Texto do header</label>
                  <Input placeholder="até 60 chars" {...form.register("headerText")} />
                  {error.headerText ? (
                    <p className="text-sm font-medium text-destructive">{String(error.headerText.message)}</p>
                  ) : null}
                </div>
              ) : null}

              {values.headerType !== "none" && values.headerType !== "text" ? (
                <div className="mt-3 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Upload (mock): JPG/PNG max 5MB, min 400x400px — será implementado ao integrar com Storage.
                </div>
              ) : null}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium">Body *</label>
                <span className={cn("text-xs", (values.body?.length ?? 0) > 1024 ? "text-destructive" : "text-muted-foreground")}>
                  {(values.body?.length ?? 0)}/1024
                </span>
              </div>
              <Textarea
                ref={(r) => {
                  textareaRef.current = r;
                }}
                rows={10}
                placeholder='Ex: "Olá {{1}}, seu pedido {{2}} foi enviado! Código de rastreamento: {{3}}."'
                {...form.register("body")}
              />
              {error.body ? <p className="text-sm font-medium text-destructive">{String(error.body.message)}</p> : null}
              <p className="text-xs text-muted-foreground">Suporta *negrito*, _itálico_, ~tachado~</p>

              <div className="flex flex-wrap gap-2">
                <VariableInsertPopover
                  nextVar={nextVar}
                  max={10}
                  disabled={!canInsertVar}
                  onInsert={(token) => insertToken(token)}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline">
                      <Smile className="h-4 w-4" /> Adicionar Emoji
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Emojis</p>
                    <div className="grid grid-cols-8 gap-2">
                      {["🙂", "😀", "😁", "😅", "😍", "🔥", "✅", "⚠️", "🎉", "💡", "📦", "🕒", "💳", "🔒", "📍", "📣"].map((e) => (
                        <button
                          key={e}
                          type="button"
                          className="rounded-md border bg-background px-2 py-1 text-sm hover:bg-accent"
                          onClick={() => addEmoji(e)}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button type="button" variant="link" onClick={() => window.open("https://developers.facebook.com/docs/whatsapp", "_blank")}
                >
                  <ExternalLink className="h-4 w-4" /> Docs
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Footer (opcional)</label>
              <Input placeholder="até 60 chars" {...form.register("footer")} />
              {error.footer ? <p className="text-sm font-medium text-destructive">{String(error.footer.message)}</p> : null}
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Botões (opcional)</p>
              <RadioGroup
                value={values.buttonsType}
                onValueChange={(v) => form.setValue("buttonsType", v as any, { shouldValidate: true })}
              >
                {(
                  [
                    { v: "none", l: "Nenhum" },
                    { v: "cta", l: "Call to Action" },
                    { v: "quick_reply", l: "Quick Reply" },
                  ] as const
                ).map((opt) => (
                  <label key={opt.v} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value={opt.v} />
                    <span>{opt.l}</span>
                  </label>
                ))}
              </RadioGroup>
              <TemplateButtonsEditor
                type={values.buttonsType}
                ctaButtons={ctaButtons}
                setCtaButtons={setCtaButtons}
                qrButtons={qrButtons}
                setQrButtons={setQrButtons}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <WhatsAppTemplatePreview
              title="Preview (tempo real)"
              header={header}
              body={values.body || ""}
              footer={values.footer || undefined}
              buttons={buttons}
            />
            {bodyVars.length ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Variáveis detectadas</p>
                <div className="flex flex-wrap gap-2">
                  {bodyVars.map((n) => (
                    <Badge key={n} variant="outline" className="font-mono">
                      {`{{${n}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma variável detectada.</p>
            )}
          </div>
        </div>
      );
    }

    // step 3
    const varTokens = extractVarNumbers(values.body || "").map((n) => `{{${n}}}`);
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-muted/20 p-4">
          <p className="text-sm font-medium">Resumo</p>
          <div className="mt-3 grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Nome</span>
              <span className="font-medium">{values.name || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Categoria</span>
              <span className="font-medium">{values.category}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Idioma</span>
              <span className="font-medium">{values.language}</span>
            </div>
          </div>
        </div>

        <WhatsAppTemplatePreview
          header={header}
          body={values.body || ""}
          footer={values.footer || undefined}
          buttons={buttons}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium">Variáveis detectadas</p>
          <div className="flex flex-wrap gap-2">
            {varTokens.length ? (
              varTokens.map((v) => (
                <Badge key={v} variant="outline" className="font-mono">
                  {v}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Nenhuma</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Você precisará fornecer estes valores ao enviar o template</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Checklist</p>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={!!values.checklistGuidelines}
              onCheckedChange={(v) => form.setValue("checklistGuidelines", v === true, { shouldValidate: true })}
            />
            <span>Template segue diretrizes do WhatsApp</span>
          </label>
          {form.formState.errors.checklistGuidelines ? (
            <p className="text-sm font-medium text-destructive">{String(form.formState.errors.checklistGuidelines.message)}</p>
          ) : null}

          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={!!values.checklistOptin} onCheckedChange={(v) => form.setValue("checklistOptin", v === true)} />
            <span>Não contém conteúdo promocional sem opt-in (se Marketing)</span>
          </label>
          {form.formState.errors.checklistOptin ? (
            <p className="text-sm font-medium text-destructive">{String(form.formState.errors.checklistOptin.message)}</p>
          ) : null}

          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={!!values.checklistVars}
              onCheckedChange={(v) => form.setValue("checklistVars", v === true, { shouldValidate: true })}
            />
            <span>Variáveis estão claras e necessárias</span>
          </label>
          {form.formState.errors.checklistVars ? (
            <p className="text-sm font-medium text-destructive">{String(form.formState.errors.checklistVars.message)}</p>
          ) : null}

          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={!!values.checklistText}
              onCheckedChange={(v) => form.setValue("checklistText", v === true, { shouldValidate: true })}
            />
            <span>Texto está correto (sem erros)</span>
          </label>
          {form.formState.errors.checklistText ? (
            <p className="text-sm font-medium text-destructive">{String(form.formState.errors.checklistText.message)}</p>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {step === 1 ? "1. Informações" : step === 2 ? "2. Conteúdo" : "3. Revisar"}
              </span>
              <span>{step}/3</span>
            </div>
            <Progress value={stepProgress} />
          </div>

          {renderStep()}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <div>
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={handleBack}>
                  Voltar
                </Button>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {step < 3 ? (
                <Button type="button" onClick={handleNext}>
                  Próximo
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                    }}
                  >
                    Salvar como Rascunho
                  </Button>
                  <Button type="button" onClick={onSubmit}>
                    Enviar para Aprovação
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
