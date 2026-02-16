import * as React from "react";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const contactsMock = [
  { id: "p1", name: "João Silva" },
  { id: "p2", name: "Maria Oliveira" },
  { id: "p3", name: "Carlos Santos" },
  { id: "p4", name: "Ana Paula" },
  { id: "p5", name: "Fernanda Lima" },
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function NewConversationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [q, setQ] = React.useState("");
  const filtered = contactsMock.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Iniciar Nova Conversa
          </DialogTitle>
          <DialogDescription>Selecione um contato para iniciar (mock).</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar contato..." />

          <div className="max-h-[340px] space-y-1 overflow-auto rounded-md border p-1">
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-muted"
                onClick={() => onOpenChange(false)}
              >
                <Avatar>
                  <AvatarFallback>{initials(c.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">Clique para iniciar</div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
