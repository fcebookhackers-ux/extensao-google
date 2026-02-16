import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { CONSENT_VERSION, defaultPreferences, type CookiePreferences } from "./cookieTypes";
import { readLocalPreferences, writeLocalPreferences } from "./cookieStorage";

type CookiePrefsState = {
  preferences: CookiePreferences | null;
  loading: boolean;
  save: (next: Omit<CookiePreferences, "consentVersion" | "decidedAt">) => Promise<void>;
  refresh: () => Promise<void>;
};

function normalizeFromDb(row: any): CookiePreferences {
  return {
    essential: true,
    analytics: !!row?.analytics,
    marketing: !!row?.marketing,
    functional: !!row?.functional,
    consentVersion: row?.consent_version ?? CONSENT_VERSION,
    decidedAt: row?.decided_at ?? new Date().toISOString(),
  };
}

export function useCookiePreferences(): CookiePrefsState {
  const { user } = useAuth();
  const [preferences, setPreferences] = React.useState<CookiePreferences | null>(() => readLocalPreferences());
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    // If user is not logged, rely on localStorage only.
    if (!user) {
      setPreferences(readLocalPreferences());
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      // Types file is read-only; keep this access flexible.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("cookie_preferences" as any)
      .select("analytics, marketing, functional, consent_version, decided_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      // If RLS or network errors happen, do not block the UI; fall back to local.
      setPreferences(readLocalPreferences());
      setLoading(false);
      return;
    }

    const next = data ? normalizeFromDb(data) : null;
    setPreferences(next);
    if (next) writeLocalPreferences(next);
    setLoading(false);
  }, [user]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const save = React.useCallback(
    async (next: Omit<CookiePreferences, "consentVersion" | "decidedAt">) => {
      const payload: CookiePreferences = {
        ...defaultPreferences(),
        ...next,
        consentVersion: CONSENT_VERSION,
        decidedAt: new Date().toISOString(),
      };

      // Always persist locally for immediate UX.
      setPreferences(payload);
      writeLocalPreferences(payload);

      if (!user) return;

      await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("cookie_preferences" as any)
        .upsert(
          {
            user_id: user.id,
            essential: true,
            analytics: payload.analytics,
            marketing: payload.marketing,
            functional: payload.functional,
            consent_version: payload.consentVersion,
            decided_at: payload.decidedAt,
          },
          { onConflict: "user_id" },
        );
    },
    [user],
  );

  return { preferences, loading, save, refresh };
}
