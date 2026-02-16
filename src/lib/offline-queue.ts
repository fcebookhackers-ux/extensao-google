import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export type QueuedOperationType = "create" | "update" | "delete";

export interface QueuedOperation {
  id: string;
  type: QueuedOperationType;
  table: string;
  data: any;
  timestamp: number;
}

type AddOperationInput = Omit<QueuedOperation, "id" | "timestamp">;

class OfflineQueue {
  private queue: QueuedOperation[] = [];
  private storageKey = "ZAPFLLOW_OFFLINE_QUEUE";
  private syncing = false;

  constructor() {
    this.loadQueue();
    this.setupSyncListener();

    // Se o app abrir já online, tenta sincronizar silenciosamente.
    if (typeof window !== "undefined" && navigator.onLine) {
      queueMicrotask(() => void this.syncAll({ showToasts: false }));
    }
  }

  private loadQueue() {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(this.storageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      this.queue = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.queue = [];
    }
  }

  private saveQueue() {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    window.dispatchEvent(new CustomEvent("offline-queue-changed", { detail: { pending: this.queue.length } }));
  }

  add(operation: AddOperationInput) {
    if (typeof window === "undefined") return;

    const queuedOp: QueuedOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    this.queue.push(queuedOp);
    this.saveQueue();

    toast.info("Operação salva. Será sincronizada quando voltar online.");
  }

  private setupSyncListener() {
    if (typeof window === "undefined") return;
    window.addEventListener("sync-pending-changes", () => {
      void this.syncAll({ showToasts: true });
    });
  }

  async syncAll({ showToasts }: { showToasts: boolean }) {
    if (this.syncing) return;
    if (typeof window === "undefined") return;
    if (!navigator.onLine) return;
    if (this.queue.length === 0) return;

    this.syncing = true;
    window.dispatchEvent(new CustomEvent("sync-start"));
    const toastId = "offline-sync";

    try {
      if (showToasts) toast.loading("Sincronizando alterações…", { id: toastId });

      const failed = new Set<string>();

      for (const operation of this.queue) {
        try {
          await this.syncOperation(operation);
        } catch (error) {
          console.error("Offline sync failed", { operation, error });
          failed.add(operation.id);
        }
      }

      // mantém apenas as que falharam
      this.queue = this.queue.filter((op) => failed.has(op.id));
      this.saveQueue();

      if (!showToasts) return;
      if (failed.size === 0) {
        toast.success("Todas as alterações foram sincronizadas!", { id: toastId });
      } else {
        toast.error(`${failed.size} operações falharam ao sincronizar.`, { id: toastId });
      }
    } finally {
      this.syncing = false;
      window.dispatchEvent(new CustomEvent("sync-end"));
    }
  }

  private async syncOperation(operation: QueuedOperation) {
    const { type, table, data } = operation;

    if (type === "create") {
      const { error } = await supabase.from(table as any).insert(data);
      if (error) throw error;
      return;
    }

    if (type === "update") {
      const { error } = await supabase.from(table as any).update(data).eq("id", data?.id);
      if (error) throw error;
      return;
    }

    if (type === "delete") {
      const { error } = await supabase.from(table as any).delete().eq("id", data?.id);
      if (error) throw error;
      return;
    }
  }

  getPendingCount() {
    return this.queue.length;
  }
}

export const offlineQueue = new OfflineQueue();
