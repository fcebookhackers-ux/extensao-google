import { useEffect, useState } from "react";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window === "undefined") return true;
    return navigator.onLine;
  });
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOnline(true);

      // Se ficou offline em algum momento, dispare sincronização ao voltar.
      if (wasOffline) {
        window.dispatchEvent(new CustomEvent("sync-pending-changes"));
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}
