import * as React from "react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Bell,
  Bot,
  FileText,
  Gauge,
  Home,
  KeyRound,
  Link2,
  MessageSquare,
  Settings,
  Shield,
  Users,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

type CommandCategory = "navigation" | "actions" | "recent";

type Command = {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  keywords?: string[];
  shortcut?: string;
  action: () => void;
  category: CommandCategory;
};

type RecentRow = { id: string; name: string | null };

function useCommandShortcut(setOpen: React.Dispatch<React.SetStateAction<boolean>>) {
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useCommandShortcut(setOpen);

  const { data: recentAutomations } = useQuery({
    queryKey: ["command-palette", "recent-automations"],
    queryFn: async (): Promise<RecentRow[]> => {
      const { data, error } = await supabase
        .from("automations")
        .select("id,name")
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as unknown as RecentRow[];
    },
    enabled: open,
  });

  const { data: recentWebhooks } = useQuery({
    queryKey: ["command-palette", "recent-webhooks"],
    queryFn: async (): Promise<RecentRow[]> => {
      const { data, error } = await supabase
        .from("webhooks")
        .select("id,name")
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as unknown as RecentRow[];
    },
    enabled: open,
  });

  const staticCommands: Command[] = useMemo(
    () => [
      // Navegação
      {
        id: "nav-inicio",
        title: "Ir para Início",
        icon: <Home className="h-4 w-4" />,
        keywords: ["home", "dashboard", "inicio"],
        shortcut: "⌘K",
        action: () => navigate("/dashboard/inicio"),
        category: "navigation",
      },
      {
        id: "nav-conversas",
        title: "Ir para Conversas",
        icon: <MessageSquare className="h-4 w-4" />,
        keywords: ["chat", "mensagens", "conversas"],
        action: () => navigate("/dashboard/conversas"),
        category: "navigation",
      },
      {
        id: "nav-automacoes",
        title: "Ir para Automações",
        icon: <Bot className="h-4 w-4" />,
        keywords: ["zap", "workflows", "automacoes"],
        action: () => navigate("/dashboard/automacoes"),
        category: "navigation",
      },
      {
        id: "nav-contatos",
        title: "Ir para Contatos",
        icon: <Users className="h-4 w-4" />,
        keywords: ["crm", "contatos"],
        action: () => navigate("/dashboard/contatos"),
        category: "navigation",
      },
      {
        id: "nav-relatorios",
        title: "Ir para Relatórios",
        icon: <FileText className="h-4 w-4" />,
        keywords: ["relatorios", "kpis"],
        action: () => navigate("/dashboard/relatorios"),
        category: "navigation",
      },
      {
        id: "nav-analytics",
        title: "Ir para Analytics",
        icon: <Gauge className="h-4 w-4" />,
        keywords: ["analytics", "metricas"],
        action: () => navigate("/dashboard/analytics"),
        category: "navigation",
      },
      {
        id: "nav-notificacoes",
        title: "Ir para Notificações",
        icon: <Bell className="h-4 w-4" />,
        keywords: ["inbox", "notificacoes"],
        action: () => navigate("/dashboard/notificacoes"),
        category: "navigation",
      },
      {
        id: "nav-atividades",
        title: "Ir para Atividades",
        icon: <Activity className="h-4 w-4" />,
        keywords: ["logs", "atividades"],
        action: () => navigate("/dashboard/atividades"),
        category: "navigation",
      },
      {
        id: "nav-configuracoes",
        title: "Ir para Configurações",
        icon: <Settings className="h-4 w-4" />,
        keywords: ["settings", "config"],
        action: () => navigate("/dashboard/configuracoes"),
        category: "navigation",
      },

      // Ações
      {
        id: "action-integracoes",
        title: "Abrir Integrações (Webhooks)",
        description: "Configurar integrações e webhooks",
        icon: <Link2 className="h-4 w-4" />,
        keywords: ["integracoes", "webhooks", "zapier", "google"],
        action: () => navigate("/dashboard/configuracoes?tab=integracoes"),
        category: "actions",
      },
      {
        id: "action-seguranca",
        title: "Abrir Segurança",
        description: "Configurações de segurança da conta",
        icon: <Shield className="h-4 w-4" />,
        keywords: ["seguranca", "password", "senha"],
        action: () => navigate("/dashboard/configuracoes?tab=seguranca"),
        category: "actions",
      },
      {
        id: "action-api",
        title: "Abrir API",
        description: "Chaves e configurações de API",
        icon: <KeyRound className="h-4 w-4" />,
        keywords: ["api", "keys", "chaves"],
        action: () => navigate("/dashboard/configuracoes?tab=api"),
        category: "actions",
      },
    ],
    [navigate],
  );

  const dynamicCommands: Command[] = useMemo(() => {
    const cmds: Command[] = [];

    for (const a of recentAutomations ?? []) {
      const title = a?.name?.trim() || "Automação sem nome";
      cmds.push({
        id: `recent-automation-${a.id}`,
        title,
        description: "Automação recente",
        icon: <Bot className="h-4 w-4" />,
        keywords: ["automacao", "recente"],
        action: () => navigate(`/dashboard/automacoes/editor/${a.id}`),
        category: "recent",
      });
    }

    for (const w of recentWebhooks ?? []) {
      const title = w?.name?.trim() || "Webhook sem nome";
      cmds.push({
        id: `recent-webhook-${w.id}`,
        title,
        description: "Webhook recente (abrir Integrações)",
        icon: <Link2 className="h-4 w-4" />,
        keywords: ["webhook", "integracoes"],
        action: () => navigate("/dashboard/configuracoes?tab=integracoes"),
        category: "recent",
      });
    }

    return cmds;
  }, [navigate, recentAutomations, recentWebhooks]);

  const filteredCommands = useMemo(() => {
    const all = [...staticCommands, ...dynamicCommands];
    if (!search.trim()) return all;

    const q = search.toLowerCase();
    return all.filter((cmd) => {
      return (
        cmd.title.toLowerCase().includes(q) ||
        (cmd.description?.toLowerCase().includes(q) ?? false) ||
        (cmd.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false)
      );
    });
  }, [dynamicCommands, search, staticCommands]);

  const grouped = useMemo(() => {
    const groups: Record<CommandCategory, Command[]> = {
      actions: [],
      navigation: [],
      recent: [],
    };
    for (const cmd of filteredCommands) groups[cmd.category].push(cmd);
    return groups;
  }, [filteredCommands]);

  const run = (cmd: Command) => {
    setOpen(false);
    setSearch("");
    cmd.action();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Digite um comando ou busque..." value={search} onValueChange={setSearch} />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        {grouped.actions.length > 0 && (
          <CommandGroup heading="Ações">
            {grouped.actions.map((cmd) => (
              <CommandItem key={cmd.id} value={cmd.title} onSelect={() => run(cmd)}>
                {cmd.icon}
                <div className="ml-2 flex flex-1 flex-col">
                  <span className="text-sm font-medium">{cmd.title}</span>
                  {cmd.description ? <span className="text-xs text-muted-foreground">{cmd.description}</span> : null}
                </div>
                {cmd.shortcut ? <CommandShortcut>{cmd.shortcut}</CommandShortcut> : null}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {grouped.actions.length > 0 && grouped.navigation.length > 0 ? <CommandSeparator /> : null}

        {grouped.navigation.length > 0 && (
          <CommandGroup heading="Navegação">
            {grouped.navigation.map((cmd) => (
              <CommandItem key={cmd.id} value={cmd.title} onSelect={() => run(cmd)}>
                {cmd.icon}
                <span className="ml-2">{cmd.title}</span>
                {cmd.shortcut ? <CommandShortcut>{cmd.shortcut}</CommandShortcut> : null}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {(grouped.recent.length > 0 && (grouped.actions.length > 0 || grouped.navigation.length > 0)) ? (
          <CommandSeparator />
        ) : null}

        {grouped.recent.length > 0 && (
          <CommandGroup heading="Recentes">
            {grouped.recent.map((cmd) => (
              <CommandItem key={cmd.id} value={cmd.title} onSelect={() => run(cmd)}>
                {cmd.icon}
                <div className="ml-2 flex flex-1 flex-col">
                  <span className="text-sm font-medium">{cmd.title}</span>
                  {cmd.description ? <span className="text-xs text-muted-foreground">{cmd.description}</span> : null}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
