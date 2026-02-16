import * as React from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: {
    analytics: boolean;
    marketing: boolean;
    functional: boolean;
  };
  onChange: (next: Props["value"]) => void;
  onSave: () => void;
};

function CategoryRow({
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function CookiePreferencesDialog({ open, onOpenChange, value, onChange, onSave }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-xl", "p-0 overflow-hidden")}> 
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="p-6"
        >
          <DialogHeader>
            <DialogTitle>Preferências de cookies</DialogTitle>
            <DialogDescription>
              Você pode escolher quais categorias permitir. Os cookies essenciais são necessários para o funcionamento do site.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-5">
            <CategoryRow
              title="Essenciais (sempre ativos)"
              description="Necessários para segurança, autenticação e recursos básicos."
              checked
              disabled
            />

            <Separator />

            <CategoryRow
              title="Analíticos"
              description="Ajudam a entender o uso do produto para melhorar performance e experiência."
              checked={value.analytics}
              onCheckedChange={(checked) => onChange({ ...value, analytics: checked })}
            />

            <Separator />

            <CategoryRow
              title="Funcionais"
              description="Habilitam recursos extras como integrações e funcionalidades de terceiros."
              checked={value.functional}
              onCheckedChange={(checked) => onChange({ ...value, functional: checked })}
            />

            <Separator />

            <CategoryRow
              title="Marketing"
              description="Usados para campanhas e personalização de anúncios (quando aplicável)."
              checked={value.marketing}
              onCheckedChange={(checked) => onChange({ ...value, marketing: checked })}
            />

            <p className="text-xs text-muted-foreground">
              Leia mais em{" "}
              <Link className="underline underline-offset-4" to="/politica-de-cookies">
                Política de Cookies
              </Link>
              .
            </p>
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-mid" onClick={onSave}>
              Salvar preferências
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
