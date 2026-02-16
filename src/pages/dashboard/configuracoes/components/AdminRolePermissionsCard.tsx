import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Permission } from "@/types/permissions";

import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLES: AppRole[] = ["admin", "moderator", "user"];
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

export function AdminRolePermissionsCard() {
  const qc = useQueryClient();
  const [role, setRole] = React.useState<AppRole>("user");
  const [selected, setSelected] = React.useState<Set<Permission>>(new Set());

  const permsQuery = useQuery({
    queryKey: ["admin", "role_permissions", role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("id,role,permission")
        .eq("role", role);
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  React.useEffect(() => {
    const next = new Set<Permission>();
    for (const r of permsQuery.data ?? []) next.add(r.permission as Permission);
    setSelected(next);
  }, [permsQuery.data]);

  const save = useMutation({
    mutationFn: async () => {
      const del = await supabase.from("role_permissions").delete().eq("role", role);
      if (del.error) throw del.error;

      const payload = Array.from(selected).map((p) => ({ role, permission: p }));
      if (payload.length === 0) return;

      const ins = await supabase.from("role_permissions").insert(payload);
      if (ins.error) throw ins.error;
    },
    onSuccess: async () => {
      toast({ title: "✅ Permissões salvas" });
      await qc.invalidateQueries({ queryKey: ["admin", "role_permissions", role] });
      // como permissões afetam a app inteira, invalidar também checks individuais
      await qc.invalidateQueries({ queryKey: ["permission"] });
      await qc.invalidateQueries({ queryKey: ["permissions"] });
    },
    onError: (err: any) => {
      toast({
        title: "Falha ao salvar permissões",
        description: String(err?.message ?? err),
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin: Permissões por Role</CardTitle>
        <CardDescription>Edite a tabela public.role_permissions (somente admin).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-[240px]">
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
            Salvar alterações
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {ALL_PERMISSIONS.map((p) => {
            const checked = selected.has(p);
            return (
              <label key={p} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <span className="font-mono text-xs">{p}</span>
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => {
                    const next = new Set(selected);
                    if (Boolean(v)) next.add(p);
                    else next.delete(p);
                    setSelected(next);
                  }}
                />
              </label>
            );
          })}
        </div>

        {permsQuery.isError ? (
          <p className="text-sm text-destructive">Não foi possível carregar role_permissions.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
