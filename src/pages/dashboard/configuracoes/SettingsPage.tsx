import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shield, Building2, Bell, Users, Link2, KeyRound, Lock, Scale, User } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";

import { ProfileTab } from "@/pages/dashboard/configuracoes/components/ProfileTab";
import { CompanyTab } from "@/pages/dashboard/configuracoes/components/CompanyTab";
import { NotificationsTab } from "@/pages/dashboard/configuracoes/components/NotificationsTab";
import { TeamTab } from "@/pages/dashboard/configuracoes/components/TeamTab";
import { IntegrationsTab } from "@/pages/dashboard/configuracoes/components/IntegrationsTab";
import { ApiTab } from "@/pages/dashboard/configuracoes/components/ApiTab";
import { SecurityTab } from "@/pages/dashboard/configuracoes/components/SecurityTab";
import { LgpdTab } from "@/pages/dashboard/configuracoes/components/LgpdTab";

type SettingsTabKey =
  | "perfil"
  | "empresa"
  | "notificacoes"
  | "equipe"
  | "integracoes"
  | "api"
  | "seguranca"
  | "lgpd";

const TABS: Array<{ key: SettingsTabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "perfil", label: "Perfil", icon: User },
  { key: "empresa", label: "Empresa", icon: Building2 },
  { key: "notificacoes", label: "Notificações", icon: Bell },
  { key: "equipe", label: "Equipe", icon: Users },
  { key: "integracoes", label: "Integrações", icon: Link2 },
  { key: "api", label: "API", icon: KeyRound },
  { key: "seguranca", label: "Segurança", icon: Shield },
  { key: "lgpd", label: "LGPD", icon: Scale },
];

function normalizeTab(value: string | null): SettingsTabKey {
  const v = (value ?? "perfil").toLowerCase();
  return (TABS.some((t) => t.key === v) ? v : "perfil") as SettingsTabKey;
}

export function SettingsPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const activeTab = React.useMemo(() => normalizeTab(params.get("tab")), [params]);

  const setTab = React.useCallback(
    (tab: SettingsTabKey) => {
      const next = new URLSearchParams(params);
      next.set("tab", tab);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Preferências, integrações e segurança da sua conta</p>
      </header>

      <Tabs value={activeTab} onValueChange={(v) => setTab(v as SettingsTabKey)}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
          {/* Sidebar / Mobile selector */}
          <aside className="space-y-3">
            {isMobile ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Seções</CardTitle>
                  <CardDescription>Escolha uma seção</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={activeTab} onValueChange={(v) => setTab(v as SettingsTabKey)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {TABS.map((t) => (
                        <SelectItem key={t.key} value={t.key}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Configurações</CardTitle>
                  <CardDescription>Navegue pelas seções</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <TabsList className="h-auto w-full flex-col items-stretch justify-start gap-1 bg-transparent p-0">
                    {TABS.map(({ key, label, icon: Icon }) => (
                      <TabsTrigger
                        key={key}
                        value={key}
                        className={
                          "h-10 w-full justify-start gap-2 rounded-md px-3 data-[state=active]:bg-brand-primary-light/10 data-[state=active]:text-brand-primary-light data-[state=active]:shadow-none data-[state=active]:border-l-2 data-[state=active]:border-brand-primary-light"
                        }
                      >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </CardContent>
              </Card>
            )}

            {/* Acesso rápido (quando veio de /dashboard/planos) */}
            {!isMobile && (
              <button
                type="button"
                onClick={() => navigate("/dashboard/planos")}
                className="inline-flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <span>Voltar para Planos</span>
                <Lock className="h-4 w-4" />
              </button>
            )}
          </aside>

          {/* Content */}
          <main className="min-w-0">
            <TabsContent value="perfil" className="mt-0">
              <ProfileTab />
            </TabsContent>
            <TabsContent value="empresa" className="mt-0">
              <CompanyTab />
            </TabsContent>
            <TabsContent value="notificacoes" className="mt-0">
              <NotificationsTab />
            </TabsContent>
            <TabsContent value="equipe" className="mt-0">
              <TeamTab />
            </TabsContent>

            <TabsContent value="integracoes" className="mt-0">
              <IntegrationsTab />
            </TabsContent>

            <TabsContent value="api" className="mt-0">
              <ApiTab />
            </TabsContent>

            <TabsContent value="seguranca" className="mt-0">
              <SecurityTab />
            </TabsContent>

            <TabsContent value="lgpd" className="mt-0">
              <LgpdTab />
            </TabsContent>
          </main>
        </div>
      </Tabs>
    </div>
  );
}
