import * as React from "react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function ConfirmDeleteContactDialog({
  open,
  onOpenChange,
  title = "Excluir Contato?",
  description = "Esta ação não pode ser desfeita. O histórico de conversas será perdido.",
  confirmLabel = "Sim, Excluir",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    if (!open) setChecked(false);
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={checked} onCheckedChange={(v) => setChecked(Boolean(v))} />
          <span>Tenho certeza que quero excluir</span>
        </label>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              !checked && "pointer-events-none opacity-50",
            )}
            onClick={() => {
              if (!checked) return;
              onConfirm();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
