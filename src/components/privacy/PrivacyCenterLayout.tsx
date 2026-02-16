import { NavLink, Outlet } from "react-router-dom";
import { Shield, Download, Trash2, SlidersHorizontal, History } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard/privacidade", label: "Visão geral", icon: Shield, end: true },
  { to: "/dashboard/privacidade/exportar", label: "Exportar dados", icon: Download },
  { to: "/dashboard/privacidade/historico", label: "Histórico", icon: History },
  { to: "/dashboard/privacidade/consentimentos", label: "Consentimentos", icon: SlidersHorizontal },
  { to: "/dashboard/privacidade/exclusao", label: "Exclusão", icon: Trash2 },
];

export function PrivacyCenterLayout() {
  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-lg border bg-card p-2">
        <nav className="space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent text-accent-foreground",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
