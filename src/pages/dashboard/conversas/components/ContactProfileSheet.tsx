import { Mail, Phone, User } from "lucide-react";

import type { ConversationThread } from "@/pages/dashboard/conversas/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/components/ui/use-toast";

export function ContactProfileSheet({
  open,
  onOpenChange,
  thread,
  contact,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  thread: ConversationThread;
  contact: { phone: string; email: string; tags: string[] };
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle>Perfil do Contato</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-56px)]">
          <div className="space-y-4 p-4">
            <div className="rounded-md border p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <User className="h-4 w-4" /> {thread.contactName}
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" /> {contact.phone}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" /> {contact.email}
                </div>
              </div>
            </div>

            <div className="rounded-md border p-4">
              <div className="text-sm font-semibold">Tags</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {contact.tags.map((t) => (
                  <Badge key={t} variant="outline" className="font-mono text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="rounded-md border p-4">
              <div className="text-sm font-semibold">Observações</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Preferência por horários da manhã; cliente recorrente; histórico de 5 conversas.
              </div>
            </div>

            <Button variant="outline" onClick={() => toast({ title: "Em breve", description: "Abrir perfil completo (mock)" })}>
              Abrir em página
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
