import * as React from "react";
import { Download, ExternalLink, Shield, Smartphone, Trash2 } from "lucide-react";

import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { MyPermissionsCard } from "@/pages/dashboard/configuracoes/components/MyPermissionsCard";

type SessionRow = {
  id: string;
  current?: boolean;
  device: string;
  location: string;
  ip: string;
  lastSeen: string;
};

type LoginHistoryRow = {
  id: string;
  timestamp: string;
  action: "Login" | "Logout" | "Tentativa falha";
  device: string;
  ip: string;
  status: "Sucesso" | "Falha" | "-";
};

export function SecurityTab() {
  const [twoFaEnabled, setTwoFaEnabled] = React.useState(false);
  const [enable2faOpen, setEnable2faOpen] = React.useState(false);

  return (
    <div className="space-y-4">
      <MyPermissionsCard />

      <TwoFactorCard
        enabled={twoFaEnabled}
        onEnable={() => setEnable2faOpen(true)}
        onDisable={() => {
          setTwoFaEnabled(false);
          toast({ title: "2FA desativado (mock)" });
        }}
        onBackupCodes={() => toast({ title: "Ver códigos de backup (mock)" })}
      />

      <Enable2FADialog
        open={enable2faOpen}
        onOpenChange={setEnable2faOpen}
        onEnabled={() => {
          setTwoFaEnabled(true);
          toast({ title: "✅ 2FA ativado com sucesso!" });
        }}
      />

      <SessionsCard />
      <LoginHistoryCard />
    </div>
  );
}

function TwoFactorCard({
  enabled,
  onEnable,
  onDisable,
  onBackupCodes,
}: {
  enabled: boolean;
  onEnable: () => void;
  onDisable: () => void;
  onBackupCodes: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Autenticação em Dois Fatores</CardTitle>
        <CardDescription>Adicione uma camada extra de segurança</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!enabled ? (
          <>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Recomendado</AlertTitle>
              <AlertDescription>Ative 2FA para proteger sua conta contra acessos não autorizados.</AlertDescription>
            </Alert>
            <Button type="button" onClick={onEnable}>
              Ativar 2FA
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge>Ativado ✅</Badge>
                  <span className="text-sm text-muted-foreground">2FA via Google Authenticator</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={onBackupCodes}>
                  Ver Códigos de Backup
                </Button>
                <Button type="button" variant="destructive" onClick={onDisable}>
                  Desativar 2FA
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Enable2FADialog({
  open,
  onOpenChange,
  onEnabled,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEnabled: () => void;
}) {
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [manualKey] = React.useState("JBSWY3DPEHPK3PXP");
  const [code, setCode] = React.useState("");
  const [saved, setSaved] = React.useState(false);

  const backupCodes = React.useMemo(
    () => [
      "A1B2-C3D4",
      "E5F6-G7H8",
      "I9J0-K1L2",
      "M3N4-O5P6",
      "Q7R8-S9T0",
      "U1V2-W3X4",
      "Y5Z6-A7B8",
      "C9D0-E1F2",
      "G3H4-I5J6",
      "K7L8-M9N0",
    ],
    [],
  );

  React.useEffect(() => {
    if (!open) {
      setStep(1);
      setCode("");
      setSaved(false);
    }
  }, [open]);

  const copyAllCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      toast({ title: "✅ Copiado", description: "Códigos copiados." });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  const downloadTxt = () => {
    const blob = new Blob([backupCodes.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ativar Autenticação em Dois Fatores</DialogTitle>
          <DialogDescription>Fluxo guiado (mock) para TOTP.</DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-3">
            <p className="text-sm">Você precisará de um aplicativo autenticador:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" /> Google Authenticator
              </li>
              <li className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" /> Microsoft Authenticator
              </li>
              <li className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" /> Authy
              </li>
              <li className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" /> Outro compatível com TOTP
              </li>
            </ul>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <p className="text-sm">Escaneie o QR Code no seu app.</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
              <div className="flex aspect-square items-center justify-center rounded-md border bg-muted/30">
                <div className="text-center text-xs text-muted-foreground">
                  QR Code (mock)
                  <div className="mt-2 rounded border bg-background px-2 py-1 font-mono">otpauth://...</div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Chave manual</p>
                <Input readOnly value={manualKey} className="font-mono" />
                <Button
                  type="button"
                  variant="link"
                  className="h-auto px-0"
                  onClick={() => window.open("https://en.wikipedia.org/wiki/Time-based_one-time_password", "_blank")}
                >
                  Entenda o TOTP
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <p className="text-sm">Confirme o código gerado pelo aplicativo.</p>
            <Input
              inputMode="numeric"
              placeholder="Digite o código de 6 dígitos"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <p className="text-xs text-muted-foreground">Dica: use qualquer código de 6 dígitos para simular.</p>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-3">
            <Alert variant="destructive" className="border-destructive/40">
              <AlertTitle>Guarde esses códigos</AlertTitle>
              <AlertDescription>
                Guarde em local seguro. Use caso perca acesso ao app autenticador.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {backupCodes.map((c) => (
                <div key={c} className="rounded-md border bg-muted/30 px-3 py-2 font-mono text-sm">
                  {c}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={copyAllCodes}>
                Copiar Todos
              </Button>
              <Button type="button" variant="outline" onClick={downloadTxt}>
                <Download className="mr-2 h-4 w-4" /> Baixar .txt
              </Button>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={saved} onCheckedChange={(v) => setSaved(Boolean(v))} />
              Salvei meus códigos de backup
            </label>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => (step === 1 ? onOpenChange(false) : setStep((s) => ((s - 1) as any)))}
          >
            {step === 1 ? "Cancelar" : "Voltar"}
          </Button>

          {step < 4 ? (
            <Button
              type="button"
              onClick={() => setStep((s) => ((s + 1) as any))}
              disabled={step === 3 && code.length !== 6}
            >
              Continuar
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!saved}
              onClick={() => {
                onEnabled();
                onOpenChange(false);
              }}
            >
              Concluir Ativação
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SessionsCard() {
  const sessions: SessionRow[] = [
    {
      id: "s1",
      current: true,
      device: "Chrome no Windows",
      location: "São Paulo, SP, Brasil",
      ip: "192.168.1.100",
      lastSeen: "Agora",
    },
    { id: "s2", device: "Safari no iPhone", location: "São Paulo, SP", ip: "192.168.1.101", lastSeen: "Há 2 horas" },
    { id: "s3", device: "Chrome no MacOS", location: "Rio de Janeiro, RJ", ip: "177.45.123.89", lastSeen: "Há 3 dias" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dispositivos Conectados</CardTitle>
        <CardDescription>Gerencie onde você está logado</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {s.current ? <Badge>Esta Sessão</Badge> : null}
                  <p className="text-sm font-medium">{s.device}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {s.location} • IP {s.ip} • Último acesso: {s.lastSeen}
                </p>
              </div>
              {s.current ? (
                <span className="text-xs text-muted-foreground">-</span>
              ) : (
                <Button type="button" variant="destructive" onClick={() => toast({ title: "Sessão desconectada (mock)" })}>
                  Desconectar
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="destructive"
          onClick={() => toast({ title: "Desconectado de todos os outros dispositivos (mock)" })}
        >
          Desconectar Todos os Outros Dispositivos
        </Button>
      </CardContent>
    </Card>
  );
}

function LoginHistoryCard() {
  const [status, setStatus] = React.useState<"all" | "success" | "fail">("all");

  const rows: LoginHistoryRow[] = React.useMemo(
    () => [
      { id: "1", timestamp: "27/01 14:32", action: "Login", device: "Chrome/Windows", ip: "192.168.1.100", status: "Sucesso" },
      { id: "2", timestamp: "27/01 08:15", action: "Login", device: "iPhone", ip: "192.168.1.101", status: "Sucesso" },
      { id: "3", timestamp: "26/01 19:45", action: "Tentativa falha", device: "-", ip: "201.34.56.78", status: "Falha" },
      { id: "4", timestamp: "26/01 18:30", action: "Logout", device: "Chrome/Windows", ip: "192.168.1.100", status: "-" },
      { id: "5", timestamp: "26/01 16:02", action: "Login", device: "Chrome/MacOS", ip: "177.45.123.89", status: "Sucesso" },
      { id: "6", timestamp: "26/01 12:11", action: "Tentativa falha", device: "-", ip: "200.10.20.30", status: "Falha" },
      { id: "7", timestamp: "25/01 21:40", action: "Login", device: "Safari/iPad", ip: "187.12.90.11", status: "Sucesso" },
      { id: "8", timestamp: "25/01 18:05", action: "Login", device: "Chrome/Windows", ip: "192.168.1.100", status: "Sucesso" },
      { id: "9", timestamp: "25/01 09:12", action: "Logout", device: "Chrome/Windows", ip: "192.168.1.100", status: "-" },
      { id: "10", timestamp: "24/01 22:30", action: "Login", device: "Android", ip: "179.10.1.2", status: "Sucesso" },
      { id: "11", timestamp: "24/01 12:30", action: "Login", device: "Chrome/Windows", ip: "192.168.1.100", status: "Sucesso" },
      { id: "12", timestamp: "24/01 08:15", action: "Tentativa falha", device: "-", ip: "189.1.2.3", status: "Falha" },
      { id: "13", timestamp: "23/01 20:01", action: "Login", device: "Chrome/MacOS", ip: "177.45.123.89", status: "Sucesso" },
      { id: "14", timestamp: "23/01 10:23", action: "Login", device: "Chrome/Windows", ip: "192.168.1.100", status: "Sucesso" },
      { id: "15", timestamp: "22/01 17:55", action: "Logout", device: "Chrome/Windows", ip: "192.168.1.100", status: "-" },
      { id: "16", timestamp: "22/01 09:01", action: "Login", device: "iPhone", ip: "192.168.1.101", status: "Sucesso" },
      { id: "17", timestamp: "21/01 13:00", action: "Tentativa falha", device: "-", ip: "201.11.22.33", status: "Falha" },
      { id: "18", timestamp: "21/01 08:00", action: "Login", device: "Chrome/Windows", ip: "192.168.1.100", status: "Sucesso" },
      { id: "19", timestamp: "20/01 19:20", action: "Login", device: "Android", ip: "179.10.1.2", status: "Sucesso" },
      { id: "20", timestamp: "20/01 18:50", action: "Logout", device: "Android", ip: "179.10.1.2", status: "-" },
    ],
    [],
  );

  const filtered = React.useMemo(() => {
    return rows.filter((r) => {
      if (status === "all") return true;
      if (status === "success") return r.status === "Sucesso";
      return r.status === "Falha";
    });
  }, [rows, status]);

  const exportCsv = () => {
    const header = ["timestamp", "acao", "dispositivo", "ip", "status"].join(",");
    const body = filtered
      .map((r) => [r.timestamp, r.action, r.device, r.ip, r.status].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "login-history.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Atividades Recentes</CardTitle>
          <CardDescription>Histórico de login (últimos 20) — mock</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="fail">Falha</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Dispositivo</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{r.timestamp}</TableCell>
                <TableCell className="text-sm">{r.action}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.device}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.ip}</TableCell>
                <TableCell>
                  {r.status === "Sucesso" ? <Badge>Sucesso ✅</Badge> : r.status === "Falha" ? <Badge variant="destructive">Falha ❌</Badge> : <Badge variant="outline">-</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
