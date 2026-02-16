import { useMemo, useState } from "react";
import { Check, ExternalLink, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebhookTemplates } from "@/hooks/useWebhookTemplates";
import type { WebhookTemplate } from "@/types/webhook-templates";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface TemplateSelectorProps {
  onSelectTemplate: (template: WebhookTemplate) => void;
  selectedTemplateId?: string;
}

const providerLabel: Record<string, string> = {
  zapier: "Zapier",
  make: "Make",
  n8n: "n8n",
  discord: "Discord",
  slack: "Slack",
  webhook_site: "Webhook.site",
  custom: "Custom",
};

export function TemplateSelector({ onSelectTemplate, selectedTemplateId }: TemplateSelectorProps) {
  const { data: templates, isLoading } = useWebhookTemplates();
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return templates ?? [];
    return (templates ?? []).filter((t) => {
      const hay = `${t.name} ${t.description ?? ""} ${t.provider}`.toLowerCase();
      return hay.includes(q);
    });
  }, [templates, searchTerm]);

  if (isLoading) {
    return (
      <div className="grid gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar templates (Zapier, Slack, Discord...)"
          className="pl-9"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((template) => {
          const selected = selectedTemplateId === template.id;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template)}
              className={cn(
                "relative w-full rounded-lg border p-4 text-left transition",
                "hover:bg-accent",
                selected ? "border-primary ring-1 ring-primary/30" : "border-border",
              )}
            >
              {selected && (
                <span className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-4 w-4" />
                </span>
              )}

              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-10 w-10 overflow-hidden rounded-md border bg-background">
                  {template.logo_url ? (
                    <img
                      src={template.logo_url}
                      alt={`Logo ${template.name}`}
                      className="h-full w-full object-contain p-1"
                      loading="lazy"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">{template.name[0]}</div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">{template.name}</p>
                    <Badge variant="secondary">{providerLabel[template.provider] ?? template.provider}</Badge>
                  </div>
                  {template.description && <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(template.default_events ?? []).slice(0, 3).map((ev) => (
                      <Badge key={ev} variant="outline">
                        {ev}
                      </Badge>
                    ))}
                    {(template.default_events ?? []).length > 3 && (
                      <Badge variant="outline">+{(template.default_events ?? []).length - 3}</Badge>
                    )}
                  </div>

                  {template.documentation_url && (
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(template.documentation_url!, "_blank", "noopener,noreferrer");
                        }}
                      >
                        Documentação
                        <ExternalLink className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
