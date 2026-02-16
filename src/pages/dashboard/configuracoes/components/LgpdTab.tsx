import * as React from "react";
import { AlertTriangle, Download, ExternalLink, Trash2 } from "lucide-react";

import { toast } from "@/hooks/use-toast";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataRetentionCard } from "@/pages/dashboard/configuracoes/components/DataRetentionCard";

export function LgpdTab() {
  return (
    <div className="space-y-4">
      <RightsCard />
      <DataRetentionCard />
      <ExportDataCard />
      <DeleteAccountCard />
      <ConsentsCard />
      <PoliciesCard />
    </div>
  );
}

function RightsCard() {
  const rights = [
    "Saber quais dados coletamos",
    "Acessar todos os seus dados",
    "Corrigir dados incorretos",
    "Solicitar exclusão dos dados",
    "Revogar consentimento",
    "Portabilidade dos dados",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacidade e Proteção de Dados (LGPD)</CardTitle>
        <CardDescription>Seus direitos e controle sobre seus dados</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          De acordo com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018), você tem direito a:
        </p>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rights.map((r) => (
            <li key={r} className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              ✅ {r}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ExportDataCard() {
  const [include, setInclude] = React.useState({
    profile: true,
    contacts: true,
    conversations: true,
    automations: true,
    templates: true,
    reports: true,
  });

  const exports = [
    { id: "e1", label: "Exportação 25/01/2026", status: "Pronto para download", expires: "5 dias", ready: true },
    { id: "e2", label: "Exportação 15/12/2025", status: "Expirado", expires: "-", ready: false },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exportar Meus Dados</CardTitle>
        <CardDescription>Baixe uma cópia completa de todos os seus dados</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">O que incluir</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={include.profile} onCheckedChange={(v) => setInclude((p) => ({ ...p, profile: Boolean(v) }))} />
              Perfil e configurações
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={include.contacts} onCheckedChange={(v) => setInclude((p) => ({ ...p, contacts: Boolean(v) }))} />
              Contatos
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={include.conversations}
                onCheckedChange={(v) => setInclude((p) => ({ ...p, conversations: Boolean(v) }))}
              />
              Conversas e mensagens
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={include.automations} onCheckedChange={(v) => setInclude((p) => ({ ...p, automations: Boolean(v) }))} />
              ZapFllow
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={include.templates} onCheckedChange={(v) => setInclude((p) => ({ ...p, templates: Boolean(v) }))} />
              Templates
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={include.reports} onCheckedChange={(v) => setInclude((p) => ({ ...p, reports: Boolean(v) }))} />
              Relatórios
            </label>
          </div>
        </div>

        <Button
          type="button"
          onClick={() =>
            toast({
              title: "Solicitação enviada",
              description: "Estamos preparando seus dados. Você receberá um email com o link de download em até 24h.",
            })
          }
        >
          Solicitar Exportação
        </Button>

        <div className="space-y-2">
          <p className="text-sm font-medium">Exportações anteriores</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exportação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exports.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.label}</TableCell>
                  <TableCell>
                    {e.ready ? <Badge>{e.status}</Badge> : <Badge variant="outline">{e.status}</Badge>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.expires}</TableCell>
                  <TableCell className="text-right">
                    {e.ready ? (
                      <Button type="button" variant="outline" onClick={() => toast({ title: "Download (mock)" })}>
                        <Download className="mr-2 h-4 w-4" /> Baixar
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function DeleteAccountCard() {
  const [checks, setChecks] = React.useState({ a: false, b: false, c: false, d: false });
  const [phrase, setPhrase] = React.useState("");

  const canDelete =
    checks.a && checks.b && checks.c && checks.d && phrase.trim().toUpperCase() === "EXCLUIR PERMANENTEMENTE";

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle>Excluir Conta Permanentemente</CardTitle>
        <CardDescription>⚠️ ATENÇÃO: Esta ação é irreversível!</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
          Ao excluir, seus dados serão permanentemente removidos e o acesso será revogado imediatamente (mock).
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Excluir Minha Conta
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" /> Tem Absoluta Certeza?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação NÃO pode ser desfeita. Todos os seus dados serão PERMANENTEMENTE excluídos.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={checks.a} onCheckedChange={(v) => setChecks((p) => ({ ...p, a: Boolean(v) }))} />
                Entendo que perderei todos os dados
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={checks.b} onCheckedChange={(v) => setChecks((p) => ({ ...p, b: Boolean(v) }))} />
                Entendo que não há reembolso
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={checks.c} onCheckedChange={(v) => setChecks((p) => ({ ...p, c: Boolean(v) }))} />
                Exportei meus dados (se necessário)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={checks.d} onCheckedChange={(v) => setChecks((p) => ({ ...p, d: Boolean(v) }))} />
                Informei minha equipe sobre a exclusão
              </label>

              <div className="space-y-2">
                <p className="text-sm font-medium">Digite 'EXCLUIR PERMANENTEMENTE' para confirmar</p>
                <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="EXCLUIR PERMANENTEMENTE" />
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setChecks({ a: false, b: false, c: false, d: false });
                  setPhrase("");
                }}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={!canDelete}
                className={!canDelete ? "pointer-events-none opacity-50" : undefined}
                onClick={() => {
                  toast({ title: "Exclusão agendada (mock)", description: "Sua conta foi marcada para exclusão em 26/02/2026." });
                }}
              >
                Sim, Excluir Tudo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function ConsentsCard() {
  const [consents, setConsents] = React.useState({ analytics: true, partners: true, marketing: false });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Consentimentos</CardTitle>
        <CardDescription>Controle o uso dos seus dados (mock)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked disabled />
            <span>
              <span className="font-medium">Coleta de dados para funcionamento da plataforma</span>
              <span className="mt-1 block text-xs text-muted-foreground">Necessário para operar o serviço (obrigatório).</span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={consents.analytics}
              onCheckedChange={(v) => setConsents((p) => ({ ...p, analytics: Boolean(v) }))}
            />
            <span>
              <span className="font-medium">Uso de cookies analíticos</span>
              <span className="mt-1 block text-xs text-muted-foreground">Para melhorar sua experiência.</span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={consents.partners} onCheckedChange={(v) => setConsents((p) => ({ ...p, partners: Boolean(v) }))} />
            <span>
              <span className="font-medium">Compartilhamento com parceiros (integrações)</span>
              <span className="mt-1 block text-xs text-muted-foreground">Apenas integrações que você ativar.</span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={consents.marketing}
              onCheckedChange={(v) => setConsents((p) => ({ ...p, marketing: Boolean(v) }))}
            />
            <span>
              <span className="font-medium">Comunicações de marketing</span>
              <span className="mt-1 block text-xs text-muted-foreground">Novidades, dicas e ofertas.</span>
            </span>
          </label>
        </div>

        <Button type="button" onClick={() => toast({ title: "✅ Consentimentos salvos (mock)" })}>
          Salvar Consentimentos
        </Button>
      </CardContent>
    </Card>
  );
}

function PoliciesCard() {
  const links = [
    { label: "Termos de Uso", href: "https://example.com/termos" },
    { label: "Política de Privacidade", href: "https://example.com/privacidade" },
    { label: "Política de Cookies", href: "https://example.com/cookies" },
    { label: "Política de LGPD", href: "https://example.com/lgpd" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Políticas e Termos</CardTitle>
        <CardDescription>Documentos e contato do encarregado (mock)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {links.map((l) => (
            <a
              key={l.label}
              className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-accent"
              href={l.href}
              target="_blank"
              rel="noreferrer"
            >
              <span>📄 {l.label}</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          ))}
        </div>
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <span className="text-muted-foreground">DPO — Encarregado de Dados:</span> <span className="font-medium">dpo@empresa.com</span>
        </div>
      </CardContent>
    </Card>
  );
}
