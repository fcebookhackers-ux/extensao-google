import * as React from "react";
import { MoreVertical } from "lucide-react";

import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { InviteMemberDialog } from "@/pages/dashboard/configuracoes/components/InviteMemberDialog";
import { RolePermissionsCard } from "@/pages/dashboard/configuracoes/components/RolePermissionsCard";
import { AdminUserRolesCard } from "@/pages/dashboard/configuracoes/components/AdminUserRolesCard";
import { AdminRolePermissionsCard } from "@/pages/dashboard/configuracoes/components/AdminRolePermissionsCard";
import { useRole } from "@/hooks/useRole";

type Member = {
  id: string;
  initials: string;
  name: string;
  email: string;
  title?: string;
  roleLabel: string;
  roleVariant?: "default" | "secondary" | "outline" | "destructive";
  statusLabel: string;
  lastSeen: string;
  canManage: boolean;
};

export function TeamTab() {
  const roleQuery = useRole();
  // Mock: Pro+ liberado
  const isStarter = false;
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const members: Member[] = [
    {
      id: "me",
      initials: "JS",
      name: "João da Silva",
      email: "joao.silva@gmail.com",
      title: "CEO",
      roleLabel: "Administrador",
      roleVariant: "default",
      statusLabel: "Ativo",
      lastSeen: "Agora",
      canManage: false,
    },
    {
      id: "maria",
      initials: "MS",
      name: "Maria Santos",
      email: "maria.santos@gmail.com",
      title: "Atendente",
      roleLabel: "Atendente",
      roleVariant: "secondary",
      statusLabel: "Ativo",
      lastSeen: "5 minutos atrás",
      canManage: true,
    },
    {
      id: "carlos",
      initials: "CO",
      name: "Carlos Oliveira",
      email: "carlos.oliveira@gmail.com",
      title: "Gerente",
      roleLabel: "Gerente",
      roleVariant: "outline",
      statusLabel: "Ativo",
      lastSeen: "1 hora atrás",
      canManage: true,
    },
    {
      id: "ana",
      initials: "AL",
      name: "Ana Lima",
      email: "ana.lima@gmail.com",
      title: "-",
      roleLabel: "Convite Pendente",
      roleVariant: "outline",
      statusLabel: "Aguardando aceite",
      lastSeen: "Há 2 dias",
      canManage: true,
    },
  ];

  if (isStarter) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Equipe</CardTitle>
            <CardDescription>Convites de equipe disponíveis apenas nos Planos Pro e Enterprise.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-muted/50 p-4">
              <p className="text-sm">⚠️ Convite de equipe disponível apenas nos Planos Pro e Enterprise</p>
              <Button className="mt-3">Fazer Upgrade</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Membros (3/5)</CardTitle>
            <CardDescription>Você tem 2 convites disponíveis</CardDescription>
          </div>
          <Button type="button" onClick={() => setInviteOpen(true)}>
            + Convidar Membro
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membro</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Perfil/Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{m.initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{m.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.title ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={m.roleVariant ?? "secondary"}>{m.roleLabel}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.statusLabel === "Ativo" ? "default" : "outline"}>{m.statusLabel}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.lastSeen}</TableCell>
                  <TableCell className="text-right">
                    {m.canManage ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toast({ title: "Editar role (mock)" })}>
                            Editar Role
                          </DropdownMenuItem>
                          {m.roleLabel === "Convite Pendente" ? (
                            <>
                              <DropdownMenuItem onClick={() => toast({ title: "Convite reenviado (mock)" })}>
                                Reenviar Convite
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => toast({ title: "Convite cancelado (mock)" })}
                              >
                                Cancelar
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => toast({ title: "Membro removido (mock)" })}
                            >
                              Remover
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RolePermissionsCard />

      {/* UI real de Admin (RBAC via Supabase) */}
      {roleQuery.data === "admin" ? (
        <>
          <AdminUserRolesCard />
          <AdminRolePermissionsCard />
        </>
      ) : null}

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
