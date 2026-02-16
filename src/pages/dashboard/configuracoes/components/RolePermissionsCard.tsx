import * as React from "react";
import { Check, X, ChevronDown } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RoleKey = "admin" | "manager" | "agent" | "viewer";

type PermissionRow = {
  feature: string;
  allowed: Record<RoleKey, boolean>;
};

const ROLE_LABEL: Record<RoleKey, string> = {
  admin: "Admin",
  manager: "Gerente",
  agent: "Atendente",
  viewer: "Visualizador",
};

const PERMISSIONS: PermissionRow[] = [
  {
    feature: "Gerenciar conversas",
    allowed: { admin: true, manager: true, agent: true, viewer: false },
  },
  {
    feature: "Criar ZapFllow",
    allowed: { admin: true, manager: true, agent: false, viewer: false },
  },
  {
    feature: "Editar templates",
    allowed: { admin: true, manager: true, agent: false, viewer: false },
  },
  {
    feature: "Gerenciar contatos",
    allowed: { admin: true, manager: true, agent: true, viewer: false },
  },
  {
    feature: "Ver relatórios",
    allowed: { admin: true, manager: true, agent: true, viewer: true },
  },
  {
    feature: "Convidar membros",
    allowed: { admin: true, manager: false, agent: false, viewer: false },
  },
  {
    feature: "Gerenciar plano/pagamento",
    allowed: { admin: true, manager: false, agent: false, viewer: false },
  },
  {
    feature: "Configurações gerais",
    allowed: { admin: true, manager: true, agent: false, viewer: false },
  },
];

function CellIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <Check className="mx-auto h-4 w-4 text-primary" aria-label="Permitido" />
  ) : (
    <X className="mx-auto h-4 w-4 text-muted-foreground" aria-label="Não permitido" />
  );
}

export function RolePermissionsCard({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <Card>
      <CardHeader>
        <CardTitle>O que cada Perfil pode fazer?</CardTitle>
        <CardDescription>Permissões por role para orientar acesso e responsabilidades.</CardDescription>
      </CardHeader>

      <CardContent>
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span>{open ? "Ocultar permissões" : "Ver permissões"}</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4">
            <div className="w-full overflow-auto rounded-md border">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[280px]">Funcionalidade</TableHead>
                    {(Object.keys(ROLE_LABEL) as RoleKey[]).map((role) => (
                      <TableHead key={role} className="text-center">
                        {ROLE_LABEL[role]}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {PERMISSIONS.map((row) => (
                    <TableRow key={row.feature}>
                      <TableCell className="font-medium">{row.feature}</TableCell>
                      {(Object.keys(ROLE_LABEL) as RoleKey[]).map((role) => (
                        <TableCell key={role} className="text-center">
                          <CellIcon ok={row.allowed[role]} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Observação: esta tabela é informativa (mock). Quando você quiser, eu conecto essas permissões ao backend
              com roles em tabela separada e validação server-side.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
