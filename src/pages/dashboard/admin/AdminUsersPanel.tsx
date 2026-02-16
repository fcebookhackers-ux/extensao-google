import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, UserRoundX, UserRoundCheck, LogIn } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AdminUser = {
  id: string;
  email: string | null;
  created_at?: string;
  last_sign_in_at?: string | null;
  banned_until?: string | null;
};

async function getInvokeErrorMessage(err: unknown): Promise<string> {
  const anyErr = err as any;
  const response = anyErr?.context;

  if (typeof Response !== "undefined" && response instanceof Response) {
    try {
      const text = await response.clone().text();
      if (text) {
        try {
          const body = JSON.parse(text);
          return body?.error ?? body?.message ?? text;
        } catch {
          return text;
        }
      }
    } catch {
      // fall back
    }
  }

  return String(anyErr?.message ?? "Erro desconhecido");
}

export function AdminUsersPanel() {
  const [query, setQuery] = React.useState("");
  const [page] = React.useState(1);
  const [perPage] = React.useState(25);

  const usersQuery = useQuery({
    queryKey: ["admin-users", page, perPage, query],
    queryFn: async (): Promise<{ users: AdminUser[] }> => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list", page, perPage, query },
      });
      if (error) {
        const message = await getInvokeErrorMessage(error);
        throw new Error(message);
      }
      return data as any;
    },
    staleTime: 15_000,
  });

  const ban = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "ban", userId, duration: "87600h" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      toast({ title: "Usuário bloqueado" });
      await usersQuery.refetch();
    },
    onError: async (err: any) => {
      const msg = await getInvokeErrorMessage(err);
      toast({ title: "Falha ao bloquear", description: msg, variant: "destructive" });
    },
  });

  const unban = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "unban", userId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      toast({ title: "Usuário desbloqueado" });
      await usersQuery.refetch();
    },
    onError: async (err: any) => {
      const msg = await getInvokeErrorMessage(err);
      toast({ title: "Falha ao desbloquear", description: msg, variant: "destructive" });
    },
  });

  const impersonate = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const redirectTo = `${window.location.origin}/dashboard/inicio`;
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "impersonation_link", email, redirectTo },
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: async (data) => {
      const link = data?.action_link;
      if (!link) {
        toast({ title: "Link não retornado", description: "Não foi possível gerar o link de impersonação.", variant: "destructive" });
        return;
      }
      try {
        await navigator.clipboard.writeText(link);
        toast({ title: "Link copiado", description: "Cole no navegador para entrar como o usuário (link temporário)." });
      } catch {
        toast({ title: "Link gerado", description: "Copie o link manualmente no console/response." });
      }
      // opcional: não navegar automaticamente (ação sensível)
    },
    onError: async (err: any) => {
      const msg = await getInvokeErrorMessage(err);
      toast({ title: "Falha ao gerar link", description: msg, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Usuários</CardTitle>
          <CardDescription>Listagem via Edge Function (Supabase Auth Admin).</CardDescription>
        </div>
        <div className="w-full sm:w-[320px]">
          <Input placeholder="Buscar por email ou UUID" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : usersQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-destructive">
                    Não foi possível carregar usuários.{" "}
                    <span className="font-normal text-muted-foreground">
                      {(usersQuery.error as Error)?.message ?? "Erro desconhecido"}
                    </span>
                  </TableCell>
                </TableRow>
              ) : usersQuery.data?.users?.length ? (
                usersQuery.data.users.map((u) => {
                  const email = u.email ?? "(sem email)";
                  const isBanned = Boolean(u.banned_until);
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="text-sm">{email}</TableCell>
                      <TableCell className="font-mono text-xs">{u.id}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(u.id);
                                toast({ title: "Copiado", description: "User ID copiado." });
                              } catch {
                                toast({ title: "Falha ao copiar", variant: "destructive" });
                              }
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" /> Copiar ID
                          </Button>

                          {email !== "(sem email)" ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={impersonate.isPending}
                              onClick={() => impersonate.mutate({ email })}
                            >
                              <LogIn className="mr-2 h-4 w-4" /> Impersonar
                            </Button>
                          ) : null}

                          {isBanned ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={unban.isPending}
                              onClick={() => unban.mutate(u.id)}
                            >
                              <UserRoundCheck className="mr-2 h-4 w-4" /> Desbloquear
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={ban.isPending}
                              onClick={() => ban.mutate(u.id)}
                            >
                              <UserRoundX className="mr-2 h-4 w-4" /> Bloquear
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-muted-foreground">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Observação: “Impersonar” gera um link temporário (magic link) e copia para sua área de transferência.
        </p>
      </CardContent>
    </Card>
  );
}
