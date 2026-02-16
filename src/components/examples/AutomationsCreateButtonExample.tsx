import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/PermissionGuard";

export function AutomationsCreateButtonExample() {
  const navigate = useNavigate();

  return (
    <PermissionGuard
      permission="automations.create"
      fallback={
        <Button variant="outline" disabled>
          Sem permissão para criar
        </Button>
      }
    >
      <Button onClick={() => navigate("/dashboard/automacoes")}>
        <Plus className="mr-2 h-4 w-4" />
        Nova Automação
      </Button>
    </PermissionGuard>
  );
}
