import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useComplianceAudit } from "@/hooks/useComplianceAudit";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sessionChecked: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { logComplianceEvent } = useComplianceAudit();
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [sessionChecked, setSessionChecked] = React.useState(false);

  React.useEffect(() => {
    // 1) Listener primeiro (evita perder eventos durante init)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_IN") {
        // best-effort (não bloqueia)
        logComplianceEvent({ action: "auth.login" });
      }

      if (event === "SIGNED_OUT") {
        // Auditoria/UX: evita “vazar” dados do cache após logout
        queryClient.clear();
      }
    });

    // 2) Sessão atual
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) console.error("Error getting session:", error);
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .catch((err) => {
        console.error("Auth initialization error:", err);
      })
      .finally(() => {
        setLoading(false);
        setSessionChecked(true);
      });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const signOut = React.useCallback(async () => {
    setLoading(true);
    try {
      await logComplianceEvent({ action: "auth.logout" });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  }, [logComplianceEvent]);

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

