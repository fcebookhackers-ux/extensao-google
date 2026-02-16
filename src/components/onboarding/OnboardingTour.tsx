import * as React from "react";

import { useAuth } from "@/providers/AuthProvider";
import { GuidedTour } from "@/components/help/GuidedTour";
import { useTour } from "@/hooks/useTour";
import type { TourId, TourStep } from "@/types/tour";

function isNewUser(createdAt?: string | null) {
  if (!createdAt) return false;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs < 24 * 60 * 60 * 1000;
}

export function OnboardingTour({
  tourId,
  steps,
  onlyForNewUsers = true,
}: {
  tourId: TourId;
  steps: TourStep[];
  /** Se true, só inicia automaticamente para contas com <24h. */
  onlyForNewUsers?: boolean;
}) {
  const { user } = useAuth();
  const { run, startTour, isCompleted } = useTour(tourId, false);

  React.useEffect(() => {
    if (!user) return;
    if (isCompleted) return;
    if (onlyForNewUsers && !isNewUser((user as any).created_at)) return;

    const t = window.setTimeout(() => startTour(), 600);
    return () => window.clearTimeout(t);
  }, [user, isCompleted, onlyForNewUsers, startTour]);

  if (!user) return null;
  return <GuidedTour tourId={tourId} steps={steps} run={run} />;
}
