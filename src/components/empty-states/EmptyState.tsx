import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "outline" | "secondary";
  icon?: LucideIcon;
}

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** @deprecated Use `action` (mantido por compatibilidade). */
  primaryAction?: EmptyStateAction;
  /** CTA principal (alias de `primaryAction`). */
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  helpLink?: {
    label: string;
    href: string;
  };
  illustration?: React.ReactNode;
  variant?: "default" | "compact" | "centered";
  className?: string;
}

function ActionButton({ action }: { action: EmptyStateAction }) {
  const Icon = action.icon;
  const content = (
    <>
      {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      {action.label}
    </>
  );

  if (action.href) {
    return (
      <Button asChild variant={action.variant ?? "default"}>
        <a href={action.href}>{content}</a>
      </Button>
    );
  }

  return (
    <Button variant={action.variant ?? "default"} onClick={action.onClick}>
      {content}
    </Button>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  action,
  secondaryAction,
  helpLink,
  illustration,
  variant = "default",
  className,
}: EmptyStateProps) {
  const isCompact = variant === "compact";
  const isCentered = variant === "centered";

  const resolvedPrimaryAction = action ?? primaryAction;

  const body = (
    <div
      className={cn(
        "flex w-full flex-col items-center text-center",
        isCompact ? "py-6" : "py-10",
      )}
    >
      {/* Icon ou Illustration */}
      {illustration ? (
        <div className={cn(isCompact ? "mb-4" : "mb-5")}>{illustration}</div>
      ) : (
        <div className={cn("mb-4 rounded-full bg-muted p-4", isCompact ? "p-3" : "p-4")}>
          <Icon
            aria-hidden
            className={cn("text-muted-foreground", isCompact ? "h-7 w-7" : "h-8 w-8")}
          />
        </div>
      )}

      {/* Title */}
      <h3 className={cn("font-semibold tracking-tight", isCompact ? "text-base" : "text-lg")}>{title}</h3>

      {/* Description */}
      <p className={cn("mb-2 max-w-sm text-muted-foreground", isCompact ? "text-sm" : "text-sm")}>{description}</p>

      {/* Actions */}
      {resolvedPrimaryAction || secondaryAction ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
          {resolvedPrimaryAction ? <ActionButton action={resolvedPrimaryAction} /> : null}
          {secondaryAction ? <ActionButton action={secondaryAction} /> : null}
        </div>
      ) : null}

      {/* Help Link */}
      {helpLink ? (
        <div className="mt-1">
          <a className="text-sm text-primary underline-offset-4 hover:underline" href={helpLink.href}>
            {helpLink.label} →
          </a>
        </div>
      ) : null}
    </div>
  );

  if (isCentered) {
    return <div className={cn("flex min-h-[18rem] w-full items-center justify-center p-6", className)}>{body}</div>;
  }

  return (
    <Card className={cn("w-full", className)}>
      <div className={cn("px-6", isCompact ? "py-2" : "py-4")}>{body}</div>
    </Card>
  );
}
