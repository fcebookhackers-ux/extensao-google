import * as React from "react";
import { CalendarIcon, Send } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

type ApprovedTemplate = {
  id: string;
  name: string;
  body: string;
  vars: Array<{ key: string; label: string; kind: "text" | "date" }>;
};

const templates: ApprovedTemplate[] = [
  {
    id: "t1",
    name: "confirmacao_agendamento",
    body: "Olá {{1}}, confirmamos seu agendamento para {{2}} às {{3}}.",
    vars: [
      { key: "1", label: "Nome", kind: "text" },
      { key: "2", label: "Data", kind: "date" },
      { key: "3", label: "Hora", kind: "text" },
    ],
  },
  {
    id: "t2",
    name: "rastreamento_pedido",
    body: "Olá {{1}}, seu pedido {{2}} foi enviado! Código: {{3}}.",
    vars: [
      { key: "1", label: "Nome", kind: "text" },
      { key: "2", label: "Pedido", kind: "text" },
      { key: "3", label: "Rastreamento", kind: "text" },
    ],
  },
];

function interpolate(body: string, values: Record<string, string>) {
  return body.replace(/\{\{(\d+)\}\}/g, (_, n) => values[n] ?? `{{${n}}}`);
}

export function SendTemplateDialog({
  open,
  onOpenChange,
  contactName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contactName: string;
}) {
  const [templateId, setTemplateId] = React.useState<string>(templates[0]!.id);
  const tpl = templates.find((t) => t.id === templateId) ?? templates[0]!;

  const [values, setValues] = React.useState<Record<string, string>>({ "1": contactName });
  const [date2, setDate2] = React.useState<Date | undefined>(undefined);

  React.useEffect(() => {
    setValues((v) => ({ ...v, "1": contactName }));
  }, [contactName]);

  const preview = React.useMemo(() => {
    const next = { ...values };
    if (date2) next["2"] = date2.toLocaleDateString();
    return interpolate(tpl.body, next);
  }, [tpl, values, date2]);

  const send = () => {
    toast({ title: "Template enviado", description: "Mensagem adicionada à conversa (mock)." });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enviar Template</DialogTitle>
          <DialogDescription>Selecione um template aprovado e preencha as variáveis (mock).</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Escolha um template</div>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {tpl.vars.map((v) => {
              if (v.kind === "date") {
                return (
                  <div key={v.key} className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">{`{{${v.key}}}`} → {v.label}</div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start text-left font-normal", !date2 && "text-muted-foreground")}
                        >
                          <CalendarIcon className="h-4 w-4" />
                          {date2 ? date2.toLocaleDateString() : <span>Selecionar</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={date2} onSelect={setDate2} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                );
              }

              return (
                <div key={v.key} className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">{`{{${v.key}}}`} → {v.label}</div>
                  <Input
                    value={values[v.key] ?? ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [v.key]: e.target.value }))}
                    placeholder={`Digite ${v.label.toLowerCase()}...`}
                  />
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Preview</div>
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{preview}</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={send} className="gap-2">
            <Send className="h-4 w-4" /> Enviar Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
