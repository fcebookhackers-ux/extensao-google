import * as React from "react";
import { Check, X } from "lucide-react";

import { useRole } from "@/hooks/useRole";
import { usePermissions } from "@/hooks/usePermission";
import type { Permission } from "@/types/permissions";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ALL_PERMISSIONS: Permission[] = [
  "automations.create",
  "automations.edit",
  "automations.delete",
  "automations.publish",
  "contacts.import",
  "contacts.export",
  "contacts.delete",
  "team.invite",
  "team.remove",
  "billing.manage",
  "billing.view",
  "analytics.view",
  "settings.manage",
];

function YesNoIcon({ ok }: { ok: boolean }) {
  return ok ? <Check className="h-4 w-4 text-primary" aria-label="Permitido" /> : <X className="h-4 w-4 text-muted-foreground" aria-label="Negado" />;
}

export function MyPermissionsCard() {
  const roleQuery = useRole();
  const permsQuery = usePermissions(ALL_PERMISSIONS);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Minhas permissões</CardTitle>
        <CardDescription>Transparência: o que sua conta pode fazer hoje.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          Role atual: <span className="font-medium text-foreground">{roleQuery.data ?? "(não definido)"}</span>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permissão</TableHead>
                <TableHead className="w-[120px] text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(permsQuery.isLoading || roleQuery.isLoading) && (
                <TableRow>
                  <TableCell colSpan={2} className="text-sm text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              )}

              {permsQuery.isError && (
                <TableRow>
                  <TableCell colSpan={2} className="text-sm text-destructive">
                    Não foi possível checar permissões.
                  </TableCell>
                </TableRow>
              )}

              {!permsQuery.isLoading && !permsQuery.isError
                ? ALL_PERMISSIONS.map((p) => (
                    <TableRow key={p}>
                      <TableCell className="font-mono text-xs">{p}</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex justify-end">
                          <YesNoIcon ok={Boolean(permsQuery.data?.[p])} />
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
