import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Bot,
  CreditCard,
  LayoutDashboard,
  MessageCircle,
  Smartphone,
  Settings,
  Users,
  FileText,
  BarChart3,
  MessageSquareText,
  Shield,
  ShieldCheck,
  Bell,
  Activity,
  AlertTriangle,
  TrendingUp,
  ListChecks,
  Gauge,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { useRole } from "@/hooks/useRole";
import { useWhatsAppInstance } from "@/hooks/useWhatsAppInstance";

function prefetchDashboardRoute(pathname: string) {
  // Prefetch de chunks de rotas comuns (ao hover/focus)
  // Observação: precisa ser um mapa estático para o bundler criar os chunks corretamente.
  switch (pathname) {
    case "/dashboard/inicio":
      void import("@/pages/dashboard/Inicio");
      break;
    case "/dashboard/conversas":
      void import("@/pages/dashboard/Conversas");
      break;
    case "/dashboard/automacoes":
      void import("@/pages/dashboard/Automacoes");
      break;
    case "/dashboard/templates":
      void import("@/pages/dashboard/Templates");
      break;
    case "/dashboard/contatos":
      void import("@/pages/dashboard/Contatos");
      break;
    case "/dashboard/relatorios":
      void import("@/pages/dashboard/Relatorios");
      break;
    case "/dashboard/analytics":
      void import("@/pages/dashboard/Analytics");
      break;
    case "/dashboard/system-health":
      void import("@/pages/dashboard/SystemHealth");
      break;
    case "/dashboard/sli":
      void import("@/pages/dashboard/SLIs");
      break;
    case "/dashboard/webhook-jobs":
      void import("@/pages/dashboard/WebhookJobs");
      break;
    case "/dashboard/alertas":
      void import("@/pages/dashboard/Alertas");
      break;
    case "/dashboard/atividades":
      void import("@/pages/dashboard/Atividades");
      break;
    case "/dashboard/notificacoes":
      void import("@/pages/dashboard/Notificacoes");
      break;
    case "/dashboard/planos":
      void import("@/pages/dashboard/Planos");
      break;
    case "/dashboard/configuracoes":
      void import("@/pages/dashboard/Configuracoes");
      break;
    case "/dashboard/privacidade":
      void import("@/pages/dashboard/Privacidade");
      break;
    case "/dashboard/audit":
      void import("@/pages/dashboard/Audit");
      break;
    case "/dashboard/admin":
      void import("@/pages/dashboard/Admin");
      break;
    default:
      break;
  }
}

const items = [
  { title: "Início", url: "/dashboard/inicio", icon: LayoutDashboard },
  { title: "WhatsApp", url: "/dashboard/whatsapp", icon: Smartphone },
  { title: "Conversas", url: "/dashboard/conversas", icon: MessageCircle },
  { title: "Automações", url: "/dashboard/automacoes", icon: Bot, dataTour: "sidebar-automations" },
  { title: "Templates", url: "/dashboard/templates", icon: FileText },
  { title: "Contatos", url: "/dashboard/contatos", icon: Users, dataTour: "sidebar-contacts" },
  { title: "Relatórios", url: "/dashboard/relatorios", icon: BarChart3 },
  { title: "Analytics", url: "/dashboard/analytics", icon: TrendingUp, dataTour: "sidebar-analytics" },
  { title: "Fila de Webhooks", url: "/dashboard/webhook-jobs", icon: ListChecks },
  { title: "Saúde", url: "/dashboard/system-health", icon: Activity },
  { title: "SLIs / SLOs", url: "/dashboard/sli", icon: Gauge },
  { title: "Alertas", url: "/dashboard/alertas", icon: AlertTriangle },
  { title: "Atividades", url: "/dashboard/atividades", icon: Activity },
  { title: "Notificações", url: "/dashboard/notificacoes", icon: Bell },
  { title: "Planos", url: "/dashboard/planos", icon: CreditCard },
  { title: "Configurações", url: "/dashboard/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const roleQuery = useRole();
  const compact = state === "collapsed";

  const workspaceId = (() => {
    try {
      return localStorage.getItem("selected-workspace-id");
    } catch {
      return null;
    }
  })();
  const { instance } = useWhatsAppInstance(workspaceId ?? undefined);
  const isWhatsappConnected = instance?.status === "connected";

  return (
    <Sidebar collapsible="icon" className={compact ? "w-14" : "w-[200px]"}>
      <SidebarHeader className="gap-2">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <MessageSquareText className="h-4 w-4" />
          </div>
          {!compact && <span className="text-sm font-semibold">ZapFlow</span>}
        </div>

        {!isWhatsappConnected && !compact && (
          <Button className="w-full justify-start" variant="default" asChild>
            <NavLink to="/dashboard/whatsapp" end className="w-full">
            Conectar WhatsApp
            </NavLink>
          </Button>
        )}

        {!isWhatsappConnected && compact && (
          <Button className="h-9 w-9" size="icon" aria-label="Conectar WhatsApp" asChild>
            <NavLink to="/dashboard/whatsapp" end>
            <MessageSquareText className="h-4 w-4" />
            </NavLink>
          </Button>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = location.pathname === item.url;
                const Icon = item.icon;
                const showWhatsappBadge = item.url === "/dashboard/whatsapp" && isWhatsappConnected && !compact;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end
                        className="w-full"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                        data-tour={item.dataTour}
                        onMouseEnter={() => prefetchDashboardRoute(item.url)}
                        onFocus={() => prefetchDashboardRoute(item.url)}
                      >
                        <Icon className="h-4 w-4" />
                        {!compact && (
                          <div className="flex w-full items-center justify-between gap-2">
                            <span>{item.title}</span>
                            {showWhatsappBadge ? <Badge variant="secondary">Online</Badge> : null}
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {roleQuery.data === "admin" ? (
                <>
                  <SidebarMenuItem key="/dashboard/audit">
                    <SidebarMenuButton asChild isActive={location.pathname === "/dashboard/audit"} tooltip="Auditoria">
                      <NavLink
                        to="/dashboard/audit"
                        end
                        className="w-full"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                        onMouseEnter={() => prefetchDashboardRoute("/dashboard/audit")}
                        onFocus={() => prefetchDashboardRoute("/dashboard/audit")}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {!compact && <span>Auditoria</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem key="/dashboard/admin">
                    <SidebarMenuButton asChild isActive={location.pathname === "/dashboard/admin"} tooltip="Admin">
                      <NavLink
                        to="/dashboard/admin"
                        end
                        className="w-full"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                        onMouseEnter={() => prefetchDashboardRoute("/dashboard/admin")}
                        onFocus={() => prefetchDashboardRoute("/dashboard/admin")}
                      >
                        <Shield className="h-4 w-4" />
                        {!compact && <span>Admin</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserMenu compact={compact} />
      </SidebarFooter>
    </Sidebar>
  );
}
