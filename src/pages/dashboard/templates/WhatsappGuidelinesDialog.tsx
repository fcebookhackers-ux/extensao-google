import * as React from "react";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function WhatsappGuidelinesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Diretrizes para Templates WhatsApp</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          <section className="space-y-2">
            <h3 className="text-base font-semibold">1. Geral</h3>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Templates devem ter propósito claro</li>
              <li>Não use abreviações ou gírias</li>
              <li>Seja conciso e direto</li>
            </ul>
          </section>
          <Separator />

          <section className="space-y-2">
            <h3 className="text-base font-semibold">2. Marketing</h3>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Usuário deve ter dado opt-in</li>
              <li>Inclua forma de opt-out</li>
              <li>Não envie spam</li>
            </ul>
          </section>
          <Separator />

          <section className="space-y-2">
            <h3 className="text-base font-semibold">3. Utilidade</h3>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Informações transacionais são permitidas</li>
              <li>Ex: confirmações, rastreamento, lembretes</li>
            </ul>
          </section>
          <Separator />

          <section className="space-y-2">
            <h3 className="text-base font-semibold">4. Autenticação</h3>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Use para OTPs e verificações</li>
              <li>Inclua tempo de validade</li>
            </ul>
          </section>
          <Separator />

          <section className="space-y-2">
            <h3 className="text-base font-semibold">5. Variáveis</h3>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Use apenas as necessárias</li>
              <li>Máximo 10 variáveis</li>
              <li>Evite variáveis no header</li>
            </ul>
          </section>
          <Separator />

          <section className="space-y-2">
            <h3 className="text-base font-semibold">6. Formatação</h3>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>*negrito*, _itálico_, ~tachado~</li>
              <li>Emojis são permitidos</li>
              <li>Quebras de linha são preservadas</li>
            </ul>
          </section>
          <Separator />

          <section className="space-y-2">
            <h3 className="text-base font-semibold">7. Motivos de rejeição comuns</h3>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Conteúdo promocional sem opt-in</li>
              <li>Muitas variáveis desnecessárias</li>
              <li>Gramática incorreta</li>
              <li>URL suspeita</li>
            </ul>
          </section>

          <div className="flex justify-end">
            <Button asChild variant="outline">
              <a
                href="https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/"
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="h-4 w-4" /> Ver documentação oficial WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
