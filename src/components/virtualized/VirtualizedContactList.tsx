import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Contact } from "@/types/contacts";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface VirtualizedContactListProps {
  contacts: Contact[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onContactClick: (contact: Contact) => void;
  className?: string;
  height?: number | string;
}

export function VirtualizedContactList({
  contacts,
  selectedIds,
  onToggleSelect,
  onContactClick,
  className,
  height = "70vh",
}: VirtualizedContactListProps) {
  const parentRef = React.useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: contacts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={cn("w-full overflow-auto", className)}
      style={{ height }}
    >
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualItems.map((virtualItem) => {
          const contact = contacts[virtualItem.index];
          const isSelected = selectedIds.has(contact.id);

          return (
            <div
              key={contact.id}
              className="absolute left-0 top-0 w-full px-1"
              style={{
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <Card
                role="button"
                tabIndex={0}
                className={cn(
                  "cursor-pointer p-3 transition-colors",
                  isSelected && "ring-2 ring-ring",
                )}
                onClick={() => onContactClick(contact)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onContactClick(contact);
                }}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(contact.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={isSelected ? "Desmarcar contato" : "Selecionar contato"}
                  />

                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {(contact.name || "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{contact.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {contact.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          <span className="truncate">{contact.phone}</span>
                        </span>
                      )}
                      {contact.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate">{contact.email}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {contact.tags?.length ? (
                    <div className="hidden shrink-0 flex-wrap items-center justify-end gap-1 sm:flex">
                      {contact.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {contact.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{contact.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  ) : null}
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
