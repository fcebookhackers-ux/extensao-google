import * as React from "react";

import { cn } from "@/lib/utils";
import type { TemplateButton, TemplateHeader } from "../templatesMock";

export function WhatsAppTemplatePreview({
  header,
  body,
  footer,
  buttons,
  title,
  className,
}: {
  header: TemplateHeader;
  body: string;
  footer?: string;
  buttons?: TemplateButton[];
  title?: string;
  className?: string;
}) {
  const hasHeader = header.type !== "none";

  return (
    <div className={cn("rounded-lg border bg-muted/30 p-3", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{title ?? "Preview"}</p>
        <p className="text-xs text-muted-foreground">WhatsApp</p>
      </div>

      <div className="mt-2 rounded-xl bg-whatsapp-chat p-3">
        <div className="flex justify-end">
          <div className="w-full max-w-[360px] rounded-2xl bg-whatsapp-bubble p-3 text-sm text-whatsapp-bubble-foreground shadow-sm">
            {hasHeader && header.type === "text" ? (
              <p className="mb-2 font-semibold leading-snug">{header.text}</p>
            ) : null}

            {hasHeader && header.type !== "text" ? (
              <div className="mb-2 rounded-lg border bg-muted/40 p-2">
                <div className="h-16 w-full rounded-md bg-muted" />
                <p className="mt-2 text-xs text-muted-foreground">{header.type.toUpperCase()} (thumbnail)</p>
              </div>
            ) : null}

            <p className="whitespace-pre-wrap break-words leading-relaxed">{body || "—"}</p>

            {footer ? <p className="mt-2 text-xs text-muted-foreground">{footer}</p> : null}

            {buttons?.length ? (
              <div className="mt-3 grid gap-2">
                {buttons.map((b) => (
                  <div key={b.id} className="rounded-lg border bg-background/70 px-3 py-2 text-center text-xs font-medium">
                    {b.text}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
