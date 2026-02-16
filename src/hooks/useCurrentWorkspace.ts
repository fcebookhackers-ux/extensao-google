import * as React from "react";

type Workspace = {
  id: string;
};

/**
 * Hook simples para recuperar o workspace atual.
 * Hoje o app usa `selected-workspace-id` no localStorage como fonte principal.
 */
export function useCurrentWorkspace() {
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(() => {
    try {
      return localStorage.getItem("selected-workspace-id");
    } catch {
      return null;
    }
  });

  const setCurrentWorkspaceId = React.useCallback((id: string | null) => {
    try {
      if (id) localStorage.setItem("selected-workspace-id", id);
      else localStorage.removeItem("selected-workspace-id");
    } catch {
      // ignore
    }
    setWorkspaceId(id);
  }, []);

  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "selected-workspace-id") setWorkspaceId(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const workspace: Workspace | null = workspaceId ? { id: workspaceId } : null;
  return { workspace, workspaceId, setCurrentWorkspaceId };
}
