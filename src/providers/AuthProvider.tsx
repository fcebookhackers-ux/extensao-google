import * as React from "react";
import { useSession, signOut as authSignOut } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

type AuthContextValue = {
  user: { id: string; email: string | null } | null;
  session: unknown | null;
  loading: boolean;
  sessionChecked: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: sessionData, isPending } = useSession();

  const user = sessionData?.user
    ? { id: sessionData.user.id, email: sessionData.user.email ?? null }
    : null;

  const session = sessionData?.session ?? null;
  const loading = isPending;
  const sessionChecked = !isPending;

  const signOut = React.useCallback(async () => {
    await authSignOut();
    queryClient.clear();
  }, [queryClient]);

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, session, loading, sessionChecked, signOut }),
    [user, session, loading, sessionChecked, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
