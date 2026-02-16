import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

function initials(email?: string | null) {
  const base = (email ?? "").split("@")[0]?.trim();
  if (!base) return "U";
  return base.slice(0, 2).toUpperCase();
}

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const onSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-sidebar-accent"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials(user?.email)}</AvatarFallback>
          </Avatar>
          {!compact && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.email ?? "Usuário"}</p>
              <p className="truncate text-xs text-muted-foreground">Conta</p>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/dashboard/configuracoes")}>
          <UserIcon className="mr-2 h-4 w-4" /> Perfil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
