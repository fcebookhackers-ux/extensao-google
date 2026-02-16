import * as React from "react";
import { toast } from "@/components/ui/sonner";

type UpdateState = {
  updateAvailable: boolean;
  applyUpdate: () => void;
};

export function useServiceWorkerUpdate(): UpdateState {
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const waitingRef = React.useRef<ServiceWorker | null>(null);

  const applyUpdate = React.useCallback(() => {
    const waiting = waitingRef.current;
    if (!waiting) {
      window.location.reload();
      return;
    }

    waiting.postMessage({ type: "SKIP_WAITING" });
  }, []);

  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let disposed = false;

    const attach = async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return;

      const checkWaiting = () => {
        if (reg.waiting) {
          waitingRef.current = reg.waiting;
          setUpdateAvailable(true);
        }
      };

      checkWaiting();

      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;

        sw.addEventListener("statechange", () => {
          if (disposed) return;
          if (sw.state === "installed") {
            // Se já existe controller, então é update (não é a primeira instalação)
            if (navigator.serviceWorker.controller) {
              waitingRef.current = reg.waiting;
              setUpdateAvailable(true);
            }
          }
        });
      });
    };

    void attach();

    const onControllerChange = () => {
      if (disposed) return;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  React.useEffect(() => {
    if (!updateAvailable) return;

    const id = toast("Nova versão disponível!", {
      description: "Clique em Atualizar para aplicar a versão mais recente.",
      duration: Infinity,
      action: {
        label: "Atualizar",
        onClick: applyUpdate,
      },
    });

    return () => {
      toast.dismiss(id);
    };
  }, [applyUpdate, updateAvailable]);

  return { updateAvailable, applyUpdate };
}
