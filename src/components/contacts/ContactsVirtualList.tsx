import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Mail } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Contact } from "@/types/contacts";

function clampTags(tags: string[]) {
  const shown = tags.slice(0, 3);
  const rest = Math.max(0, tags.length - shown.length);
  return { shown, rest };
}

export function ContactsVirtualList({
  rows,
  selected,
  onToggle,
  onToggleAllVisible,
  canToggleAllVisible,
  isLoading,
  onLoadMore,
  hasMore,
  onHoverContact,
  onOpenContact,
}: {
  rows: Contact[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAllVisible: (ids: string[]) => void;
  canToggleAllVisible: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
  onHoverContact?: (id: string) => void;
  onOpenContact?: (id: string) => void;
}) {
  const parentRef = React.useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: hasMore ? rows.length + 1 : rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 12,
  });

  // Fetch next page when reaching the loader row
  React.useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    const last = virtualItems[virtualItems.length - 1];
    if (!last) return;
    if (last.index >= rows.length - 5 && hasMore && !isLoading) onLoadMore();
  }, [rowVirtualizer, rows.length, hasMore, isLoading, onLoadMore]);

  const visibleContactIds = React.useMemo(() => {
    const ids: string[] = [];
    rowVirtualizer.getVirtualItems().forEach((v) => {
      if (v.index < rows.length) ids.push(rows[v.index].id);
    });
    return ids;
  }, [rowVirtualizer, rows]);

  const allVisibleSelected =
    visibleContactIds.length > 0 && visibleContactIds.every((id) => selected.has(id));
  const anyVisibleSelected = visibleContactIds.some((id) => selected.has(id));

  return (
    <div className="rounded-lg border bg-background">
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allVisibleSelected}
            aria-checked={anyVisibleSelected && !allVisibleSelected ? "mixed" : undefined}
            disabled={!canToggleAllVisible || visibleContactIds.length === 0}
            onCheckedChange={() => onToggleAllVisible(visibleContactIds)}
          />
          <span className="text-sm text-muted-foreground">Selecionar visíveis</span>
        </div>
        <div className="text-xs text-muted-foreground">{rows.length} carregados</div>
      </div>

      <div ref={parentRef} className="h-[70vh] overflow-auto">
        <div
          className="relative w-full"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const isLoaderRow = virtualRow.index >= rows.length;

            if (isLoaderRow) {
              return (
                <div
                  key={virtualRow.key}
                  className="absolute left-0 top-0 w-full p-4 text-center text-sm text-muted-foreground"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  {hasMore ? "Carregando mais..." : "Fim da lista"}
                </div>
              );
            }

            const c = rows[virtualRow.index];
            const { shown, rest } = clampTags(c.tags ?? []);
            const checked = selected.has(c.id);

            return (
              <div
                key={virtualRow.key}
                className={cn(
                  "absolute left-0 top-0 w-full",
                  "border-b last:border-b-0",
                  "flex items-center gap-3 p-3",
                  "hover:bg-muted/40",
                )}
                style={{ transform: `translateY(${virtualRow.start}px)` }}
                onMouseEnter={() => onHoverContact?.(c.id)}
                role={onOpenContact ? "button" : undefined}
                tabIndex={onOpenContact ? 0 : undefined}
                onClick={() => onOpenContact?.(c.id)}
                onKeyDown={(e) => {
                  if (!onOpenContact) return;
                  if (e.key === "Enter" || e.key === " ") onOpenContact(c.id);
                }}
              >
                <div className="shrink-0">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onToggle(c.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.phone ?? "—"}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{c.email ?? "—"}</span>
                  </div>
                </div>

                <div className="hidden min-w-[220px] flex-wrap justify-end gap-1 sm:flex">
                  {shown.map((t) => (
                    <Badge key={t} variant="secondary" className="rounded-full">
                      {t}
                    </Badge>
                  ))}
                  {rest > 0 ? (
                    <Badge variant="outline" className="rounded-full">
                      +{rest}
                    </Badge>
                  ) : null}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard?.writeText(c.phone ?? "").catch(() => {});
                  }}
                >
                  Copiar
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
