import * as React from "react";
import { CalendarClock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";

type ScheduleItem = {
  id: string;
  label: string;
  paused: boolean;
};

export function ScheduleReportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [freq, setFreq] = React.useState<"daily" | "weekly" | "monthly">("weekly");
  const [weekday, setWeekday] = React.useState<"seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom">("seg");
  const [monthday, setMonthday] = React.useState("1");
  const [time, setTime] = React.useState("09:00");
  const [emails, setEmails] = React.useState("joao@empresa.com");
  const [format, setFormat] = React.useState<"pdf" | "xlsx">("pdf");
  const [sections, setSections] = React.useState({
    visao_geral: true,
    automacoes: true,
    conversas: true,
    templates: true,
    equipe: true,
  });

  const [schedules, setSchedules] = React.useState<ScheduleItem[]>([
    {
      id: "s1",
      label: "Relatório Semanal - Toda segunda às 9h → joao@empresa.com",
      paused: false,
    },
  ]);

  React.useEffect(() => {
    if (!open) return;
    // reset visual-only defaults when abrir (mantém lista)
    setFreq("weekly");
    setWeekday("seg");
    setMonthday("1");
    setTime("09:00");
    setEmails("joao@empresa.com");
    setFormat("pdf");
    setSections({ visao_geral: true, automacoes: true, conversas: true, templates: true, equipe: true });
  }, [open]);

  const submit = () => {
    const when =
      freq === "daily"
        ? `Diário às ${time}`
        : freq === "weekly"
          ? `Semanal (${weekday}) às ${time}`
          : `Mensal (dia ${monthday}) às ${time}`;
    const label = `Relatório ${freq === "daily" ? "Diário" : freq === "weekly" ? "Semanal" : "Mensal"} - ${when} → ${emails}`;
    setSchedules((p) => [{ id: `s${p.length + 2}`, label, paused: false }, ...p]);

    toast({
      title: "Envio agendado",
      description: `Quando: ${when} • Formato: ${format.toUpperCase()} • Emails: ${emails} (mock)`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" /> Agendar Envio
          </DialogTitle>
          <DialogDescription>Defina a frequência e o email de destino (mock).</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Frequência</div>
            <Select value={freq} onValueChange={(v) => setFreq(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Frequência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {freq === "weekly" ? (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Dia da semana</div>
              <Select value={weekday} onValueChange={(v) => setWeekday(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Dia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seg">Segunda</SelectItem>
                  <SelectItem value="ter">Terça</SelectItem>
                  <SelectItem value="qua">Quarta</SelectItem>
                  <SelectItem value="qui">Quinta</SelectItem>
                  <SelectItem value="sex">Sexta</SelectItem>
                  <SelectItem value="sab">Sábado</SelectItem>
                  <SelectItem value="dom">Domingo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {freq === "monthly" ? (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Dia do mês</div>
              <Input value={monthday} onChange={(e) => setMonthday(e.target.value)} inputMode="numeric" placeholder="1" />
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Horário</div>
            <Input value={time} onChange={(e) => setTime(e.target.value)} type="time" />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Email(s)</div>
            <Input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="ex: joao@empresa.com, maria@empresa.com" />
            <div className="text-xs text-muted-foreground">Separe múltiplos emails por vírgula.</div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Formato</div>
            <Select value={format} onValueChange={(v) => setFormat(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Formato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
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
                  <Checkbox
                    checked={(sections as any)[k]}
                    onCheckedChange={(v) => setSections((p) => ({ ...(p as any), [k]: Boolean(v) }) as any)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Agendamentos</div>
            <div className="space-y-2">
              {schedules.map((s) => (
                <div key={s.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm">
                    <div className="font-medium">{s.label}</div>
                    <div className="text-xs text-muted-foreground">Status: {s.paused ? "Pausado" : "Ativo"}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSchedules((p) => p.map((x) => (x.id === s.id ? { ...x, paused: !x.paused } : x)));
                        toast({ title: s.paused ? "Agendamento retomado" : "Agendamento pausado", description: s.label });
                      }}
                    >
                      {s.paused ? "Retomar" : "Pausar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toast({ title: "Editar", description: "Edição (mock)" })}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSchedules((p) => p.filter((x) => x.id !== s.id));
                        toast({ title: "Agendamento excluído", description: s.label });
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Agendar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
