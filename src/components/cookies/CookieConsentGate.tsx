import * as React from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CookiePreferencesDialog } from "./CookiePreferencesDialog";
import { useCookiePreferences } from "./useCookiePreferences";

export function CookieConsentGate() {
  const { preferences, loading, save } = useCookiePreferences();
  const reduceMotion = useReducedMotion();

  const [prefsDraft, setPrefsDraft] = React.useState({
    analytics: true,
    marketing: true,
    functional: true,
  });
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // When we already have preferences, keep the draft in sync (for editing later).
  React.useEffect(() => {
    if (!preferences) return;
    setPrefsDraft({
      analytics: preferences.analytics,
      marketing: preferences.marketing,
      functional: preferences.functional,
    });
  }, [preferences]);

  // Banner visibility: only if user hasn't decided yet.
  const showBanner = !loading && !preferences;

  const onAcceptAll = async () => {
    await save({ essential: true, analytics: true, marketing: true, functional: true });
  };

  const onReject = async () => {
    // As solicitado: Rejeitar = Essenciais + Analíticos
    await save({ essential: true, analytics: true, marketing: false, functional: false });
  };

  const onSaveDialog = async () => {
    await save({ essential: true, ...prefsDraft });
    setDialogOpen(false);
  };

  return (
    <>
      <CookiePreferencesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        value={prefsDraft}
        onChange={setPrefsDraft}
        onSave={onSaveDialog}
      />

      {showBanner ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4"
        >
          <Card
            className={cn(
              "mx-auto max-w-5xl",
              "border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80",
              "shadow-lg",
            )}
          >
            <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:gap-6">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Nós usamos cookies</p>
                <p className="text-sm text-muted-foreground">
                  Usamos cookies para melhorar sua experiência, medir uso e oferecer funcionalidades. Você pode aceitar, rejeitar
                  ou gerenciar suas preferências.
                  {" "}
                  <Link className="underline underline-offset-4" to="/politica-de-cookies">
                    Ver detalhes
                  </Link>
                  .
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <Button variant="outline" onClick={onReject}>
                  Rejeitar
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(true)}>
                  Gerir preferências
                </Button>
                <Button
                  className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-mid"
                  onClick={onAcceptAll}
                >
                  Aceitar
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      ) : null}
    </>
  );
}
