import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/types/permissions";

import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ROLES: AppRole[] = ["admin", "moderator", "user"];

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function AdminUserRolesCard() {
  const qc = useQueryClient();
  const [userId, setUserId] = React.useState("");
  const [role, setRole] = React.useState<AppRole>("user");

  const rolesQuery = useQuery({
    queryKey: ["admin", "user_roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("id,user_id,role,created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  const setUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Mantém 1 role por usuário (modelo simples). Se quiser multi-role, removemos o delete.
      const del = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (del.error) throw del.error;

      const ins = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (ins.error) throw ins.error;
    },
    onSuccess: async () => {
      toast({ title: "✅ Role atualizada" });
      setUserId("");
      setRole("user");
      await qc.invalidateQueries({ queryKey: ["admin", "user_roles"] });
    },
    onError: (err: any) => {
      toast({
        title: "Falha ao atualizar role",
        description: String(err?.message ?? err),
        variant: "destructive",
      });
    },
  });

  const removeRow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast({ title: "Removido" });
      await qc.invalidateQueries({ queryKey: ["admin", "user_roles"] });
    },
    onError: (err: any) => {
      toast({
        title: "Falha ao remover",
        description: String(err?.message ?? err),
        variant: "destructive",
      });
    },
  });

  const canSubmit = isUuid(userId) && !setUserRole.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin: Papéis de Usuários</CardTitle>
        <CardDescription>Atribua roles via tabela public.user_roles (somente admin).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="admin-user-id">User ID (UUID)</Label>
            <Input
              id="admin-user-id"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={userId}
              onChange={(e) => setUserId(e.target.value.trim())}
            />
            {userId && !isUuid(userId) ? (
              <p className="text-xs text-muted-foreground">Informe um UUID válido.</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
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

          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() => setUserRole.mutate({ userId, role })}
          >
            Salvar
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rolesQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : rolesQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-destructive">
                    Não foi possível carregar user_roles.
                  </TableCell>
                </TableRow>
              ) : rolesQuery.data?.length ? (
                rolesQuery.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.user_id}</TableCell>
                    <TableCell className="text-sm">{row.role}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={removeRow.isPending}
                        onClick={() => removeRow.mutate(row.id)}
                      >
                        Remover
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-muted-foreground">
                    Nenhuma role cadastrada ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground">
          Dica: pegue o User ID em <span className="font-medium">Supabase &gt; Auth &gt; Users</span>.
        </p>
      </CardContent>
    </Card>
  );
}
