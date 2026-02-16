import * as React from "react";
import { Plus } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ContactFilters } from "@/components/contacts/ContactFilters";
import { BulkActions } from "@/components/contacts/BulkActions";
import { ContactsVirtualList } from "@/components/contacts/ContactsVirtualList";
import { CreateContactDialog } from "@/components/contacts/CreateContactDialog";
import { useCreateContact, useInfiniteContacts } from "@/hooks/useContacts";
import { usePrefetchRelated } from "@/hooks/usePrefetch";
import type { ContactFilters as ContactFiltersType } from "@/types/contacts";
import { ContactEnrichmentReviewSheet } from "@/components/contacts/ContactEnrichmentReviewSheet";

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border bg-background p-10 text-center">
      <div className="h-14 w-14 rounded-full bg-muted" />
      <div className="space-y-1">
        <p className="text-base font-semibold">Nenhum contato encontrado</p>
        <p className="text-sm text-muted-foreground">Tente ajustar seus filtros ou revisar as tags.</p>
      </div>
      <button type="button" className="text-sm underline underline-offset-4" onClick={onClear}>
        Limpar filtros
      </button>
    </div>
  );
}

export default function DashboardContatos() {
  const [filters, setFilters] = React.useState<ContactFiltersType>({});
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = React.useState(false);
  const [activeContactId, setActiveContactId] = React.useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  const query = useInfiniteContacts(filters);
  const rows = React.useMemo(() => query.data?.pages.flatMap((p) => p.data) ?? [], [query.data]);

  const { prefetchContactDetails } = usePrefetchRelated();

  // Prefetch leve: aquece cache para os 3 primeiros contatos.
  React.useEffect(() => {
    rows.slice(0, 3).forEach((c) => void prefetchContactDetails(c.id));
  }, [prefetchContactDetails, rows]);

  const createContact = useCreateContact();

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const openDetails = (id: string) => {
    setActiveContactId(id);
    setDetailsOpen(true);
  };

  const toggleAllVisible = (ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));
      ids.forEach((id) => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Contatos</h1>
          <p className="text-sm text-muted-foreground">Busca full-text + filtros + ações em lote + virtualização</p>
        </div>

        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo contato
        </Button>
      </header>

      <section className="rounded-lg border bg-background p-4">
        <ContactFilters filters={filters} onChange={(next) => {
          setFilters(next);
          clearSelection();
        }} />
      </section>

      <BulkActions selectedIds={Array.from(selectedIds)} onClearSelection={clearSelection} />

      <CreateContactDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isCreating={createContact.isPending}
        onCreate={(payload) => {
          createContact.mutate(payload, {
            onSuccess: () => setCreateOpen(false),
          });
        }}
      />

      <ContactEnrichmentReviewSheet
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        contactId={activeContactId}
      />

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[40%]" />
                  <Skeleton className="h-3 w-[60%]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <div className="rounded-lg border bg-background p-6 text-sm text-muted-foreground">
          Falha ao carregar contatos. Verifique sua sessão/autenticação e tente novamente.
        </div>
      ) : rows.length === 0 ? (
        <EmptyState onClear={() => setFilters({})} />
      ) : (
        <ContactsVirtualList
          rows={rows}
          selected={selectedIds}
          onToggle={toggle}
          onToggleAllVisible={toggleAllVisible}
          canToggleAllVisible
          isLoading={query.isFetchingNextPage}
          hasMore={Boolean(query.hasNextPage)}
          onLoadMore={() => query.fetchNextPage()}
          onHoverContact={(id) => void prefetchContactDetails(id)}
          onOpenContact={openDetails}
        />
      )}
    </div>
  );
}
