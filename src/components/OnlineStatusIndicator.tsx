import * as React from "react";
import { CloudOff, RefreshCw } from "lucide-react";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { offlineQueue } from "@/lib/offline-queue";
import { cn } from "@/lib/utils";

export function OnlineStatusIndicator() {
  const { isOnline } = useOnlineStatus();
  const [pendingCount, setPendingCount] = React.useState(() => offlineQueue.getPendingCount());
  const [syncing, setSyncing] = React.useState(false);

  React.useEffect(() => {
    const update = () => setPendingCount(offlineQueue.getPendingCount());
    update();

    const onQueueChanged = () => update();

    const onSyncStart = () => setSyncing(true);
    const onSyncEnd = () => setSyncing(false);

    window.addEventListener("offline-queue-changed", onQueueChanged as EventListener);
    window.addEventListener("sync-start", onSyncStart as EventListener);
    window.addEventListener("sync-end", onSyncEnd as EventListener);

    return () => {
      window.removeEventListener("offline-queue-changed", onQueueChanged as EventListener);
      window.removeEventListener("sync-start", onSyncStart as EventListener);
      window.removeEventListener("sync-end", onSyncEnd as EventListener);
    };
  }, []);

  const show = !isOnline || pendingCount > 0;
  if (!show) return null;

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-foreground",
        "hover:bg-accent"
      )}
      onClick={() => {
        if (!isOnline) return;
        if (pendingCount === 0) return;
        window.dispatchEvent(new CustomEvent("sync-pending-changes"));
      }}
      title={
        !isOnline
          ? "Você está offline"
          : pendingCount > 0
            ? "Clique para sincronizar alterações pendentes"
            : ""
      }
    >
      {!isOnline ? (
        <CloudOff className="h-4 w-4 text-muted-foreground" />
      ) : (
        <RefreshCw
          className={cn(
            "h-4 w-4 text-muted-foreground",
            syncing ? "animate-spin" : ""
          )}
        />
      )}

      <span className="font-medium">{!isOnline ? "Offline" : "Sincronizar"}</span>

      {pendingCount > 0 ? (
        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{pendingCount}</span>
      ) : null}
    </button>
  );
}
