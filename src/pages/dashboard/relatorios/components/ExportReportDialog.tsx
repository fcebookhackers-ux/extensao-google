import * as React from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

type SectionKey = "visao_geral" | "automacoes" | "conversas" | "templates" | "equipe";

export function ExportReportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [format, setFormat] = React.useState<"pdf" | "xlsx" | "csv">("pdf");
  const [email, setEmail] = React.useState("");
  const [includeCharts, setIncludeCharts] = React.useState(true);
  const [sections, setSections] = React.useState<Record<SectionKey, boolean>>({
    visao_geral: true,
    automacoes: true,
    conversas: true,
    templates: true,
    equipe: true,
  });
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (!open) {
      setLoading(false);
      setProgress(0);
    }
  }, [open]);

  const generate = async () => {
    setLoading(true);
    setProgress(12);
    await new Promise((r) => setTimeout(r, 450));
    setProgress(46);
    await new Promise((r) => setTimeout(r, 450));
    setProgress(78);
    await new Promise((r) => setTimeout(r, 450));
    setProgress(100);
    await new Promise((r) => setTimeout(r, 200));

    toast({
      title: "Relatório exportado com sucesso!",
      description: `Formato: ${format.toUpperCase()} • Seções: ${Object.entries(sections)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(", ")} ${email ? `• Enviado para: ${email}` : ""} (mock)`,
    });
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" /> Exportar Relatório
          </DialogTitle>
          <DialogDescription>Escolha o formato, seções e opções (mock).</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Formato</div>
            <Select value={format} onValueChange={(v) => setFormat(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Formato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Seções</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["visao_geral", "Visão Geral"],
                  ["automacoes", "ZapFllow"],
                  ["conversas", "Conversas"],
                  ["templates", "Templates"],
                  ["equipe", "Equipe"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <Checkbox checked={sections[k]} onCheckedChange={(v) => setSections((p) => ({ ...p, [k]: Boolean(v) }))} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={includeCharts} onCheckedChange={(v) => setIncludeCharts(Boolean(v))} />
            Incluir gráficos
          </label>

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Email de envio (opcional)</div>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ex: joao@empresa.com" type="email" />
          </div>

          {loading ? (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Gerando relatório...</div>
              <Progress value={progress} />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={loading} onClick={generate}>
            Gerar Relatório
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
