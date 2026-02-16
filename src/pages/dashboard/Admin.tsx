import * as React from "react";
import { Users, Shield, KeyRound } from "lucide-react";

import { useRole } from "@/hooks/useRole";
import { SpinnerMessage } from "@/components/common/loading/SpinnerMessage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AdminUsersPanel } from "@/pages/dashboard/admin/AdminUsersPanel";
import { AdminUserRolesCard } from "@/pages/dashboard/configuracoes/components/AdminUserRolesCard";
import { AdminRolePermissionsCard } from "@/pages/dashboard/configuracoes/components/AdminRolePermissionsCard";

export default function DashboardAdmin() {
  const roleQuery = useRole();

  if (roleQuery.isLoading) return <SpinnerMessage message="Carregando…" />;
  if (roleQuery.data !== "admin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso restrito</CardTitle>
          <CardDescription>Esta área é exclusiva para administradores.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Se você precisa de acesso, solicite ao admin da conta.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Gestão global de usuários, papéis e permissões.</p>
      </header>

      <Tabs defaultValue="users">
        <TabsList className="flex flex-wrap justify-start">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" /> Roles
          </TabsTrigger>
          <TabsTrigger value="perms" className="gap-2">
            <KeyRound className="h-4 w-4" /> Permissões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <AdminUsersPanel />
        </TabsContent>
        <TabsContent value="roles" className="mt-4">
          <AdminUserRolesCard />
        </TabsContent>
        <TabsContent value="perms" className="mt-4">
          <AdminRolePermissionsCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
