import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";

type CRDTType = "contact" | "automation";

export class CRDTDocument<T extends Record<string, any>> {
  private ydoc: Y.Doc;
  private persistence: IndexeddbPersistence;
  private rootMap: Y.Map<any>;

  constructor(public id: string, public type: CRDTType) {
    this.ydoc = new Y.Doc();
    this.persistence = new IndexeddbPersistence(`zapfllow-${type}-${id}`, this.ydoc);
    this.rootMap = this.ydoc.getMap("root");
  }

  get data(): T {
    return this.rootMap.toJSON() as T;
  }

  set<K extends keyof T>(key: K, value: T[K]) {
    this.rootMap.set(key as string, value);
    void this.syncIfOnline();
  }

  update(partial: Partial<T>) {
    Object.entries(partial).forEach(([key, value]) => {
      this.rootMap.set(key, value);
    });
    void this.syncIfOnline();
  }

  onUpdate(callback: (data: T) => void) {
    const observer = () => {
      callback(this.data);
    };
    this.rootMap.observe(observer);
    return () => this.rootMap.unobserve(observer);
  }

  destroy() {
    this.persistence.destroy();
    this.ydoc.destroy();
  }

  private async syncIfOnline() {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    try {
      const update = Y.encodeStateAsUpdate(this.ydoc);
      await this.sendToServer(update);
    } catch (e) {
      console.warn("CRDT sync failed", e);
    }
  }

  private async sendToServer(update: Uint8Array) {
    const params = new URLSearchParams({ type: this.type, id: this.id });
    // Ensure ArrayBuffer (not SharedArrayBuffer) for Blob compatibility
    const arr = new Uint8Array(update.length);
    arr.set(update);
    const blob = new Blob([arr], { type: "application/octet-stream" });
    await fetch(`/functions/v1/sync-yjs?${params.toString()}`, {
      method: "POST",
      body: blob,
      headers: { "Content-Type": "application/octet-stream" },
    }).catch(() => {
      // silencioso; OfflineQueue continua cuidando de operações transacionais
    });
  }
}
