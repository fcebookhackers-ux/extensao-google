import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { OnlineStatusIndicator } from "@/components/OnlineStatusIndicator";

const labelMap: Record<string, string> = {
  dashboard: "Dashboard",
  inicio: "Início",
  "conectar-whatsapp": "Conectar WhatsApp",
  conversas: "Conversas",
  automacoes: "ZapFllow",
  editor: "Editor",
  templates: "Templates",
  contatos: "Contatos",
  relatorios: "Relatórios",
  planos: "Planos",
  configuracoes: "Configurações",
  notificacoes: "Notificações",
  "system-health": "Saúde do sistema",
};

export function Topbar() {
  const location = useLocation();
  const parts = location.pathname.split("/").filter(Boolean);

  const crumbs = parts.map((p, idx) => {
    const href = "/" + parts.slice(0, idx + 1).join("/");
    return { segment: p, href, label: labelMap[p] ?? p };
  });

  const last = crumbs[crumbs.length - 1];

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4">
        <SidebarTrigger />

        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((c, idx) => {
              const isLast = last?.href === c.href;
              return (
                <span key={c.href} className="inline-flex items-center">
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{c.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={c.href}>{c.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {idx < crumbs.length - 1 && <BreadcrumbSeparator />}
                </span>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden w-72 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar…" />
          </div>

          <OnlineStatusIndicator />

          <NotificationsBell />

          <div className="md:hidden">
            <UserMenu compact />
          </div>
        </div>
      </div>
    </header>
  );
}
