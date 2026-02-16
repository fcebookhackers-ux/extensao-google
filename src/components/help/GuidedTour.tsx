import Joyride, { CallBackProps, STATUS, type Step } from "react-joyride";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { TourId, TourStep } from "@/types/tour";

interface GuidedTourProps {
  tourId: TourId;
  steps: TourStep[];
  run: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

export function GuidedTour({
  tourId,
  steps,
  run,
  onComplete,
  onSkip,
}: GuidedTourProps) {
  const [completedTours, setCompletedTours] = useLocalStorage<string[]>(
    "completed-tours",
    [],
  );

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      if (!completedTours.includes(tourId)) {
        setCompletedTours([...completedTours, tourId]);
      }

      if (status === STATUS.FINISHED && onComplete) {
        onComplete();
      }

      if (status === STATUS.SKIPPED && onSkip) {
        onSkip();
      }
    }
  };

  if (completedTours.includes(tourId)) {
    return null;
  }

  return (
    <Joyride
      steps={steps as Step[]}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          textColor: "hsl(var(--foreground))",
          backgroundColor: "hsl(var(--background))",
          overlayColor: "rgba(0, 0, 0, 0.4)",
          arrowColor: "hsl(var(--background))",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
          padding: 20,
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          borderRadius: 6,
          color: "hsl(var(--primary-foreground))",
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
        },
      }}
      locale={{
        back: "Voltar",
        close: "Fechar",
        last: "Finalizar",
        next: "Próximo",
        skip: "Pular tour",
      }}
    />
  );
}
