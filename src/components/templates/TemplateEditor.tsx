import * as React from "react";
import { Plus, Save } from "lucide-react";
import { z } from "zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

import { TemplateLibrary } from "@/components/templates/TemplateLibrary";
import { WhatsAppPreview } from "@/components/templates/WhatsAppPreview";
import { extractNamedVariables, renderTemplate, validateVariableName } from "@/components/templates/template-utils";
import { useCreateMessageTemplate } from "@/hooks/useMessageTemplates";

const SaveSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Informe um nome")
    .max(64, "Máximo 64 caracteres")
    .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e underscore"),
  description: z.string().trim().max(200, "Máximo 200 caracteres").optional().or(z.literal("")),
  body: z.string().trim().min(1, "Mensagem é obrigatória").max(2048, "Máximo 2048 caracteres"),
});

const COMMON_VARS = [
  { key: "nome", label: "nome" },
  { key: "empresa", label: "empresa" },
  { key: "produto", label: "produto" },
  { key: "link_catalogo", label: "link_catalogo" },
];

function insertAtCursor(el: HTMLTextAreaElement, insert: string) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  const next = el.value.slice(0, start) + insert + el.value.slice(end);
  const caret = start + insert.length;
  return { next, caret };
}

export function TemplateEditor() {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [template, setTemplate] = React.useState("");
  const [variables, setVariables] = React.useState<string[]>([]);
  const [previewData, setPreviewData] = React.useState<Record<string, string>>({});
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const create = useCreateMessageTemplate();

  React.useEffect(() => {
    const vars = extractNamedVariables(template);
    setVariables(vars);
    setPreviewData((prev) => {
      const next: Record<string, string> = {};
      vars.forEach((v) => (next[v] = prev[v] ?? ""));
      return next;
    });
  }, [template]);

  const validationErrors = React.useMemo(() => {
    const invalid = variables.filter((v) => !validateVariableName(v));
    return invalid;
  }, [variables]);

  const insertVariable = (varKey?: string) => {
    const key = (varKey ?? "").trim() || "variavel";
    if (!textareaRef.current) {
      setTemplate((prev) => `${prev}${prev ? " " : ""}{{${key}}}`);
      return;
    }
    const ta = textareaRef.current;
    const { next, caret } = insertAtCursor(ta, `{{${key}}}`);
    setTemplate(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(caret, caret);
    });
  };

  const saveTemplate = async () => {
    const parsed = SaveSchema.safeParse({
      name,
      description,
      body: template,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    if (validationErrors.length) {
      toast.error(`Variáveis inválidas: ${validationErrors.join(", ")}`);
      return;
    }

    try {
      await create.mutateAsync({
        name: parsed.data.name,
        description: parsed.data.description,
        body: parsed.data.body,
        variables,
      });
      toast.success("Template salvo");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível salvar o template");
    }
  };

  const rendered = React.useMemo(() => renderTemplate(template, previewData), [template, previewData]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Editor */}
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>Editor de Template</CardTitle>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: boas_vindas" />
              <p className="text-xs text-muted-foreground">letras_minúsculas_underscore</p>
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descrição" />
              <p className="text-xs text-muted-foreground">opcional</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              ref={(r) => {
                textareaRef.current = r;
              }}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="Olá {{nome}}, tudo bem?"
              rows={10}
              className="font-mono"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline">
                    <Plus className="h-4 w-4" /> Inserir variável
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Variáveis comuns</p>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_VARS.map((v) => (
                      <Button
                        key={v.key}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable(v.key)}
                      >
                        {`{{${v.label}}}`}
                      </Button>
                    ))}
                  </div>
                  <Separator className="my-3" />
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Biblioteca</p>
                  <TemplateLibrary
                    onSelect={(t) => {
                      setTemplate(t);
                      toast.message("Template carregado");
                    }}
                  />
                </PopoverContent>
              </Popover>

              <Button type="button" onClick={saveTemplate} disabled={create.isPending}>
                <Save className="h-4 w-4" /> {create.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Variáveis detectadas</Label>
            {variables.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma variável detectada.</p>
            ) : (
              <div className="space-y-2">
                {variables.map((v) => (
                  <div key={v} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Badge variant={validateVariableName(v) ? "outline" : "destructive"} className="w-fit font-mono">
                      {`{{${v}}}`}
                    </Badge>
                    <Input
                      placeholder={`Valor para ${v}`}
                      value={previewData[v] || ""}
                      onChange={(e) =>
                        setPreviewData((prev) => ({
                          ...prev,
                          [v]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
            {validationErrors.length ? (
              <p className="text-sm font-medium text-destructive">
                Variáveis inválidas: {validationErrors.join(", ")} (use apenas letras/números/_ e sem espaços)
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <WhatsAppPreview message={rendered} />
        </CardContent>
      </Card>
    </div>
  );
}
