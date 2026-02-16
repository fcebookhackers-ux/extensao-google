import * as React from "react";
import Papa from "papaparse";
import { Download, Tag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ProgressStatus } from "@/components/common/loading/ProgressStatus";
import { supabase } from "@/integrations/supabase/client";
import { useBulkActions } from "@/hooks/useContacts";
import { toast } from "sonner";

interface BulkActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
}

type ExportState =
  | { status: "idle" }
  | { status: "exporting"; progress: number; current: number; total: number };

export function BulkActions({ selectedIds, onClearSelection }: BulkActionsProps) {
  const { bulkUpdate, isUpdating } = useBulkActions();
  const [showTagDialog, setShowTagDialog] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [newTags, setNewTags] = React.useState("");
  const [exportState, setExportState] = React.useState<ExportState>({ status: "idle" });

  const busy = isUpdating || exportState.status !== "idle";

  const handleAddTags = () => {
    const tags = newTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!tags.length) {
      toast.error("Informe ao menos uma tag");
      return;
    }

    bulkUpdate({
      contactIds: selectedIds,
      action: "add_tags",
      payload: { tags },
    });

    setShowTagDialog(false);
    setNewTags("");
    onClearSelection();
  };

  const handleDelete = () => {
    bulkUpdate({
      contactIds: selectedIds,
      action: "delete",
    });
    setShowDeleteDialog(false);
    onClearSelection();
  };

  const handleExportCsv = async () => {
    if (!selectedIds.length) return;

    // Client-side export em chunks para evitar timeouts / limites.
    const chunkSize = 200;
    const total = selectedIds.length;
    const chunks = Array.from({ length: Math.ceil(total / chunkSize) }, (_, i) =>
      selectedIds.slice(i * chunkSize, (i + 1) * chunkSize),
    );

    setExportState({ status: "exporting", progress: 0, current: 0, total });

    try {
      const allRows: Array<Record<string, any>> = [];

      for (let i = 0; i < chunks.length; i++) {
        const ids = chunks[i];
        const { data, error } = await supabase
          .from("contacts")
          .select("id,name,phone,email,tags,status,created_at,updated_at")
          .in("id", ids);

        if (error) throw error;

        (data ?? []).forEach((row) => {
          allRows.push({
            id: row.id,
            name: row.name,
            phone: row.phone,
            email: row.email,
            tags: Array.isArray(row.tags) ? row.tags.join(";") : "",
            status: row.status,
            created_at: row.created_at,
            updated_at: row.updated_at,
          });
        });

        const current = Math.min((i + 1) * chunkSize, total);
        const progress = total ? (current / total) * 100 : 0;
        setExportState({ status: "exporting", progress, current, total });
      }

      const csv = Papa.unparse(allRows, { quotes: true });
      const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contatos-selecionados-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success("Exportação concluída");
      onClearSelection();
    } catch (e) {
      console.error(e);
      toast.error("Falha ao exportar contatos");
    } finally {
      setExportState({ status: "idle" });
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="sticky top-0 z-10 rounded-lg border bg-background p-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{selectedIds.length} selecionados</span>
            <Button type="button" variant="ghost" size="sm" onClick={onClearSelection} disabled={busy}>
              Limpar seleção
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowTagDialog(true)} disabled={busy}>
              <Tag className="h-4 w-4" />
              Adicionar tags
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleExportCsv} disabled={busy}>
              <Download className="h-4 w-4" />
              Exportar selecionados
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)} disabled={busy}>
              <Trash2 className="h-4 w-4" />
              Excluir selecionados
            </Button>
          </div>
        </div>

        {exportState.status === "exporting" ? (
          <div className="mt-3">
            <ProgressStatus
              progress={exportState.progress}
              label="Exportando CSV"
              current={exportState.current}
              total={exportState.total}
            />
          </div>
        ) : null}
      </div>

      {/* Add Tags Dialog */}
      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Tags</DialogTitle>
            <DialogDescription>
              Adicione tags separadas por vírgula aos {selectedIds.length} contatos selecionados.
            </DialogDescription>
          </DialogHeader>

          <Input
            placeholder="Ex: VIP, Lead Quente"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowTagDialog(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleAddTags} disabled={busy}>
              Adicionar Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir permanentemente {selectedIds.length} contatos? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={busy}>
              Excluir {selectedIds.length} contatos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
