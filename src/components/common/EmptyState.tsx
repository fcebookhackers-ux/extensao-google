import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateAction = {
  label: string;
  onClick: () => void;
  variant?: ButtonProps["variant"];
};

export type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  illustration?: string;
  action?: EmptyStateAction;
  actions?: EmptyStateAction[];
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  illustration,
  action,
  actions,
  className,
}: EmptyStateProps) {
  const resolvedActions = actions ?? (action ? [action] : []);

  return (
    <div className={cn("flex min-h-[18rem] w-full items-center justify-center p-8", className)}>
      <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
        {illustration ? (
          <img
            src={illustration}
            alt="Ilustração"
            loading="lazy"
            className="mb-6 max-h-40 w-auto select-none"
          />
        ) : null}

        <div className="mb-4 text-muted-foreground" aria-hidden>
          <div className="[&>svg]:h-16 [&>svg]:w-16">{icon}</div>
        </div>

        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-base text-muted-foreground">{description}</p>

        {resolvedActions.length ? (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            {resolvedActions.map((a) => (
              <Button key={a.label} variant={a.variant ?? "default"} onClick={a.onClick}>
                {a.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
